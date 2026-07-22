<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HandoverItem;
use App\Models\Shift;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ShiftHistoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $shifts = $this->filteredQuery($request)
            ->orderByDesc('shift_date')
            ->orderByDesc('id')
            ->get();

        return response()->json($shifts);
    }

    public function export(Request $request): StreamedResponse
    {
        $shifts = $this->filteredQuery($request)
            ->orderByDesc('shift_date')
            ->orderByDesc('id')
            ->get();

        return response()->streamDownload(function () use ($shifts): void {
            $handle = fopen('php://output', 'w');

            if ($handle === false) {
                return;
            }

            fputcsv($handle, [
                'Shift ID',
                'Shift date',
                'Heads count',
                'CO2 used kg',
                'CO2 per head g',
                'Meat temp C',
                'Failures count',
                'Open handover items',
                'Notes excerpt',
            ]);

            foreach ($shifts as $shift) {
                fputcsv($handle, [
                    $shift->id,
                    $shift->shift_date?->toDateString(),
                    $shift->heads_count,
                    $shift->co2_used_kg,
                    $shift->co2_per_head_g,
                    $shift->meat_temp_c,
                    $shift->failures_count ?? 0,
                    $shift->open_handover_items_count ?? 0,
                    Str::limit(trim((string) ($shift->notes ?: $shift->raw_text)), 180, '...'),
                ]);
            }

            fclose($handle);
        }, 'shift-history-'.now()->toDateString().'.csv', [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    public function show(Shift $shift): JsonResponse
    {
        $shift->load([
            'failures',
            'maintenanceEvents',
            'shiftNotes',
            'handoverItems',
            'attachments',
        ]);

        return response()->json($shift);
    }

    private function filteredQuery(Request $request): Builder
    {
        $query = Shift::query()
            ->withCount([
                'failures',
                'attachments',
                'handoverItems as open_handover_items_count' => fn (Builder $handoverQuery) => $handoverQuery->whereIn('status', [
                    HandoverItem::STATUS_OPEN,
                    HandoverItem::STATUS_IN_PROGRESS,
                ]),
            ]);

        if (($search = $this->normalized($request->query('q'))) !== null) {
            $like = '%'.$search.'%';

            $query->where(function (Builder $searchQuery) use ($like): void {
                $searchQuery
                    ->whereRaw('LOWER(COALESCE(raw_text, \'\')) like ?', [$like])
                    ->orWhereRaw('LOWER(COALESCE(notes, \'\')) like ?', [$like])
                    ->orWhereHas('shiftNotes', fn (Builder $noteQuery) => $noteQuery
                        ->whereRaw('LOWER(content) like ?', [$like]))
                    ->orWhereHas('failures', fn (Builder $failureQuery) => $failureQuery
                        ->whereRaw('LOWER(problem) like ?', [$like])
                        ->orWhereRaw('LOWER(COALESCE(cause, \'\')) like ?', [$like])
                        ->orWhereRaw('LOWER(COALESCE(solution, \'\')) like ?', [$like])
                        ->orWhereRaw('LOWER(COALESCE(equipment_name, \'\')) like ?', [$like]))
                    ->orWhereHas('maintenanceEvents', fn (Builder $maintenanceQuery) => $maintenanceQuery
                        ->whereRaw('LOWER(action) like ?', [$like])
                        ->orWhereRaw('LOWER(COALESCE(parts_used, \'\')) like ?', [$like])
                        ->orWhereRaw('LOWER(COALESCE(equipment_name, \'\')) like ?', [$like]))
                    ->orWhereHas('handoverItems', fn (Builder $handoverQuery) => $handoverQuery
                        ->whereRaw('LOWER(title) like ?', [$like])
                        ->orWhereRaw('LOWER(COALESCE(details, \'\')) like ?', [$like])
                        ->orWhereRaw('LOWER(COALESCE(equipment_name, \'\')) like ?', [$like]));
            });
        }

        if (($fromDate = $this->normalizedDate($request->query('from'))) !== null) {
            $query->whereDate('shift_date', '>=', $fromDate);
        }

        if (($toDate = $this->normalizedDate($request->query('to'))) !== null) {
            $query->whereDate('shift_date', '<=', $toDate);
        }

        if (($equipment = $this->normalized($request->query('equipment'))) !== null) {
            $like = '%'.$equipment.'%';

            $query->where(function (Builder $equipmentQuery) use ($like): void {
                $equipmentQuery
                    ->whereHas('failures', fn (Builder $failureQuery) => $failureQuery
                        ->whereRaw('LOWER(COALESCE(equipment_name, \'\')) like ?', [$like]))
                    ->orWhereHas('maintenanceEvents', fn (Builder $maintenanceQuery) => $maintenanceQuery
                        ->whereRaw('LOWER(COALESCE(equipment_name, \'\')) like ?', [$like]))
                    ->orWhereHas('handoverItems', fn (Builder $handoverQuery) => $handoverQuery
                        ->whereRaw('LOWER(COALESCE(equipment_name, \'\')) like ?', [$like]));
            });
        }

        if ($this->normalizedBoolean($request->query('has_failures')) === true) {
            $query->whereHas('failures');
        }

        if ($this->normalizedBoolean($request->query('has_open_handover')) === true) {
            $query->whereHas('handoverItems', fn (Builder $handoverQuery) => $handoverQuery->whereIn('status', [
                HandoverItem::STATUS_OPEN,
                HandoverItem::STATUS_IN_PROGRESS,
            ]));
        }

        return $query;
    }

    private function normalized(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $normalized = mb_strtolower(trim($value));

        return $normalized === '' ? null : $normalized;
    }

    private function normalizedDate(mixed $value): ?string
    {
        if (! is_string($value) || trim($value) === '') {
            return null;
        }

        try {
            return Carbon::parse($value)->toDateString();
        } catch (\Throwable) {
            return null;
        }
    }

    private function normalizedBoolean(mixed $value): ?bool
    {
        if (! is_string($value) && ! is_bool($value) && ! is_int($value)) {
            return null;
        }

        return filter_var($value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
    }
}
