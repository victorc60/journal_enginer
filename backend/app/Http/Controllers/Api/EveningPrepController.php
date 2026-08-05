<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreEveningPrepRequest;
use App\Models\EveningPrep;
use App\Models\EveningPrepEntry;
use App\Models\EveningPrepItem;
use App\Support\WorkWeek;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class EveningPrepController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $prepDate = $this->resolveDate($request->query('date'));

        return response()->json($this->payloadForDate($prepDate));
    }

    public function store(StoreEveningPrepRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $prepDate = $this->resolveDate($validated['prep_date']);
        $targetDate = $prepDate->addDay();
        $expectedIsNextDaySlaughter = WorkWeek::isWorkDay($targetDate);

        if (! $expectedIsNextDaySlaughter) {
            return response()->json([
                'message' => 'По графику вечерняя подготовка сохраняется только если следующий день попадает на рабочую неделю с воскресенья по четверг.',
            ], 422);
        }

        if (! $validated['is_next_day_slaughter']) {
            return response()->json([
                'message' => 'Подготовка сохраняется только если на следующий день запланирован день забоя.',
            ], 422);
        }

        $submittedEntries = collect($validated['entries'] ?? [])
            ->keyBy(fn (array $entry): int => (int) $entry['evening_prep_item_id']);

        $itemsToPersist = EveningPrepItem::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('section')
            ->orderBy('title')
            ->orderBy('id')
            ->get()
            ->keyBy('id');

        DB::transaction(function () use ($prepDate, $targetDate, $itemsToPersist, $submittedEntries): void {
            $prep = EveningPrep::query()->updateOrCreate(
                [
                    'prep_date' => $prepDate->toDateString(),
                ],
                [
                    'target_date' => $targetDate->toDateString(),
                    'is_next_day_slaughter' => true,
                ]
            );

            if ($itemsToPersist->isEmpty()) {
                return;
            }

            $timestamp = now();
            $rows = $itemsToPersist->map(function (EveningPrepItem $item) use ($prep, $submittedEntries, $timestamp): array {
                $entry = $submittedEntries->get($item->id);

                return [
                    'evening_prep_id' => $prep->id,
                    'evening_prep_item_id' => $item->id,
                    'item_section' => $item->section,
                    'item_title' => $item->title,
                    'item_details' => $item->details,
                    'is_checked' => (bool) ($entry['is_checked'] ?? false),
                    'note' => $this->normalizedNullableString($entry['note'] ?? null),
                    'created_at' => $timestamp,
                    'updated_at' => $timestamp,
                ];
            })->values()->all();

            EveningPrepEntry::query()->upsert(
                $rows,
                ['evening_prep_id', 'evening_prep_item_id'],
                ['item_section', 'item_title', 'item_details', 'is_checked', 'note', 'updated_at']
            );
        });

        return response()->json($this->payloadForDate($prepDate));
    }

    private function payloadForDate(CarbonImmutable $prepDate): array
    {
        $expectedIsNextDaySlaughter = WorkWeek::isWorkDay($prepDate->addDay());
        $items = EveningPrepItem::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('section')
            ->orderBy('title')
            ->orderBy('id')
            ->get();

        $prep = EveningPrep::query()
            ->whereDate('prep_date', $prepDate->toDateString())
            ->with([
                'entries' => fn ($query) => $query
                    ->orderBy('item_section')
                    ->orderBy('item_title')
                    ->orderBy('id'),
            ])
            ->first();

        $entryByItemId = $prep?->entries->keyBy('evening_prep_item_id') ?? collect();
        $checklistItems = $items->map(function (EveningPrepItem $item) use ($entryByItemId): array {
            /** @var EveningPrepEntry|null $entry */
            $entry = $entryByItemId->get($item->id);

            return [
                'evening_prep_item_id' => $item->id,
                'section' => $item->section,
                'title' => $item->title,
                'details' => $item->details,
                'sort_order' => $item->sort_order,
                'is_active' => (bool) $item->is_active,
                'is_checked' => (bool) ($entry?->is_checked ?? false),
                'note' => $entry?->note,
            ];
        });

        return [
            'prep_date' => $prepDate->toDateString(),
            'target_date' => $prep?->target_date?->toDateString() ?? $prepDate->addDay()->toDateString(),
            'expected_is_next_day_slaughter' => $expectedIsNextDaySlaughter,
            'checklist_items' => $this->sortedChecklistItems($checklistItems)->values()->all(),
            'prep' => $prep ? [
                'id' => $prep->id,
                'prep_date' => $prep->prep_date?->toDateString(),
                'target_date' => $prep->target_date?->toDateString(),
                'is_next_day_slaughter' => (bool) $prep->is_next_day_slaughter,
                'checked_count' => $prep->entries->where('is_checked', true)->count(),
                'entries' => $prep->entries->map(function (EveningPrepEntry $entry): array {
                    return [
                        'id' => $entry->id,
                        'evening_prep_item_id' => $entry->evening_prep_item_id,
                        'item_section' => $entry->item_section,
                        'item_title' => $entry->item_title,
                        'item_details' => $entry->item_details,
                        'is_checked' => (bool) $entry->is_checked,
                        'note' => $entry->note,
                    ];
                })->values()->all(),
            ] : null,
        ];
    }

    private function resolveDate(mixed $value): CarbonImmutable
    {
        if (! is_string($value) || trim($value) === '') {
            return CarbonImmutable::today();
        }

        try {
            return CarbonImmutable::parse($value)->startOfDay();
        } catch (\Throwable) {
            return CarbonImmutable::today();
        }
    }

    private function sortedChecklistItems(Collection $items): Collection
    {
        return $items->sortBy(function (array $item): string {
            return sprintf(
                '%05d|%s|%s|%010d',
                (int) ($item['sort_order'] ?? 9999),
                mb_strtolower((string) ($item['section'] ?? '')),
                mb_strtolower((string) ($item['title'] ?? '')),
                (int) ($item['evening_prep_item_id'] ?? 0)
            );
        });
    }

    private function normalizedNullableString(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $normalized = trim($value);

        return $normalized === '' ? null : $normalized;
    }
}
