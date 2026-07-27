<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMorningRoundRequest;
use App\Models\MorningRound;
use App\Models\MorningRoundEntry;
use App\Models\MorningRoundItem;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class MorningRoundController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $date = $this->resolveDate($request->query('date'));

        return response()->json($this->payloadForDate($date));
    }

    public function store(StoreMorningRoundRequest $request): JsonResponse
    {
        $validated = $request->validated();

        if (! $validated['is_slaughter_day']) {
            return response()->json([
                'message' => 'Обход сохраняется только для дней забоя.',
            ], 422);
        }

        $roundDate = $this->resolveDate($validated['round_date']);
        $submittedEntries = collect($validated['entries'] ?? [])
            ->keyBy(fn (array $entry): int => (int) $entry['morning_round_item_id']);

        $submittedItemIds = $submittedEntries->keys()
            ->map(fn (int|string $id): int => (int) $id)
            ->values();

        $itemsToPersist = MorningRoundItem::query()
            ->where('is_active', true)
            ->when(
                $submittedItemIds->isNotEmpty(),
                fn ($query) => $query->orWhereIn('id', $submittedItemIds->all())
            )
            ->orderBy('sort_order')
            ->orderBy('section')
            ->orderBy('title')
            ->orderBy('id')
            ->get()
            ->keyBy('id');

        DB::transaction(function () use ($roundDate, $itemsToPersist, $submittedEntries): void {
            $round = MorningRound::query()->updateOrCreate(
                [
                    'round_date' => $roundDate->toDateString(),
                ],
                [
                    'is_slaughter_day' => true,
                ]
            );

            if ($itemsToPersist->isEmpty()) {
                return;
            }

            $timestamp = now();
            $rows = $itemsToPersist->map(function (MorningRoundItem $item) use ($round, $submittedEntries, $timestamp): array {
                $entry = $submittedEntries->get($item->id);

                return [
                    'morning_round_id' => $round->id,
                    'morning_round_item_id' => $item->id,
                    'item_section' => $item->section,
                    'item_title' => $item->title,
                    'item_details' => $item->details,
                    'is_checked' => (bool) ($entry['is_checked'] ?? false),
                    'note' => $this->normalizedNullableString($entry['note'] ?? null),
                    'created_at' => $timestamp,
                    'updated_at' => $timestamp,
                ];
            })->values()->all();

            MorningRoundEntry::query()->upsert(
                $rows,
                ['morning_round_id', 'morning_round_item_id'],
                ['item_section', 'item_title', 'item_details', 'is_checked', 'note', 'updated_at']
            );
        });

        return response()->json($this->payloadForDate($roundDate));
    }

    private function payloadForDate(CarbonImmutable $date): array
    {
        $templateItems = MorningRoundItem::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('section')
            ->orderBy('title')
            ->orderBy('id')
            ->get();

        $round = MorningRound::query()
            ->whereDate('round_date', $date->toDateString())
            ->with([
                'entries' => fn ($query) => $query
                    ->orderBy('item_section')
                    ->orderBy('item_title')
                    ->orderBy('id'),
            ])
            ->first();

        $entryByItemId = $round?->entries->keyBy('morning_round_item_id') ?? collect();
        $templateItemIds = $templateItems->pluck('id')->all();

        $checklistItems = $templateItems->map(function (MorningRoundItem $item) use ($entryByItemId): array {
            /** @var MorningRoundEntry|null $entry */
            $entry = $entryByItemId->get($item->id);

            return [
                'morning_round_item_id' => $item->id,
                'section' => $item->section,
                'title' => $item->title,
                'details' => $item->details,
                'sort_order' => $item->sort_order,
                'is_active' => (bool) $item->is_active,
                'is_checked' => (bool) ($entry?->is_checked ?? false),
                'note' => $entry?->note,
                'from_history_only' => false,
            ];
        });

        $historyOnlyItems = $round?->entries
            ->filter(fn (MorningRoundEntry $entry): bool => ! in_array($entry->morning_round_item_id, $templateItemIds, true))
            ->map(function (MorningRoundEntry $entry): array {
                return [
                    'morning_round_item_id' => $entry->morning_round_item_id,
                    'section' => $entry->item_section,
                    'title' => $entry->item_title,
                    'details' => $entry->item_details,
                    'sort_order' => 9999,
                    'is_active' => false,
                    'is_checked' => (bool) $entry->is_checked,
                    'note' => $entry->note,
                    'from_history_only' => true,
                ];
            })
            ->values() ?? collect();

        $mergedChecklistItems = $this->sortedChecklistItems($checklistItems->concat($historyOnlyItems));

        return [
            'date' => $date->toDateString(),
            'template_items' => $templateItems,
            'checklist_items' => $mergedChecklistItems->values()->all(),
            'round' => $round ? [
                'id' => $round->id,
                'round_date' => $round->round_date?->toDateString(),
                'is_slaughter_day' => (bool) $round->is_slaughter_day,
                'checked_count' => $round->entries->where('is_checked', true)->count(),
                'entries' => $round->entries->map(function (MorningRoundEntry $entry): array {
                    return [
                        'id' => $entry->id,
                        'morning_round_item_id' => $entry->morning_round_item_id,
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
                (int) ($item['morning_round_item_id'] ?? 0)
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
