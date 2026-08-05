<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Equipment;
use App\Models\Failure;
use App\Models\HandoverItem;
use App\Models\Shift;
use App\Models\ShiftAttachment;
use App\Support\WorkWeek;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    public function summary(Request $request): JsonResponse
    {
        [$fromDate, $toDate] = $this->resolvedRange($request);

        $summary = $this->constrainShiftDateRange(Shift::query(), $fromDate, $toDate)
            ->selectRaw('COUNT(*) as total_shifts')
            ->selectRaw('AVG(heads_count) as average_heads_count')
            ->selectRaw('AVG(co2_per_head_g) as average_co2_per_head_g')
            ->first();

        return response()->json([
            'range' => [
                'from' => $fromDate,
                'to' => $toDate,
                'scope' => 'work_week',
            ],
            'total_shifts' => (int) ($summary?->total_shifts ?? 0),
            'average_heads_count' => $this->roundNullable($summary?->average_heads_count),
            'average_co2_per_head_g' => $this->roundNullable($summary?->average_co2_per_head_g),
            'total_failures' => Failure::query()
                ->whereHas('shift', fn (Builder $query) => $this->constrainShiftDateRange($query, $fromDate, $toDate))
                ->count(),
            'open_handover_items' => HandoverItem::query()
                ->whereIn('status', [HandoverItem::STATUS_OPEN, HandoverItem::STATUS_IN_PROGRESS])
                ->count(),
            'attachments_count' => ShiftAttachment::query()
                ->whereHas('shift', fn (Builder $query) => $this->constrainShiftDateRange($query, $fromDate, $toDate))
                ->count(),
            'tracked_equipment' => Equipment::query()->count(),
        ]);
    }

    public function co2(Request $request): JsonResponse
    {
        [$fromDate, $toDate] = $this->resolvedRange($request);

        $co2UsageByDate = $this->constrainShiftDateRange(Shift::query(), $fromDate, $toDate)
            ->select('shift_date')
            ->selectRaw('SUM(co2_used_kg) as co2_used_kg')
            ->whereNotNull('co2_used_kg')
            ->groupBy('shift_date')
            ->orderBy('shift_date')
            ->get()
            ->map(fn (Shift $shift): array => [
                'shift_date' => $shift->shift_date->toDateString(),
                'co2_used_kg' => $this->roundNullable($shift->co2_used_kg),
            ])
            ->all();

        $co2PerHeadByDate = $this->constrainShiftDateRange(Shift::query(), $fromDate, $toDate)
            ->select('shift_date')
            ->selectRaw('AVG(co2_per_head_g) as co2_per_head_g')
            ->whereNotNull('co2_per_head_g')
            ->groupBy('shift_date')
            ->orderBy('shift_date')
            ->get()
            ->map(fn (Shift $shift): array => [
                'shift_date' => $shift->shift_date->toDateString(),
                'co2_per_head_g' => $this->roundNullable($shift->co2_per_head_g),
            ])
            ->all();

        return response()->json([
            'co2_usage_by_date' => $co2UsageByDate,
            'co2_per_head_by_date' => $co2PerHeadByDate,
        ]);
    }

    public function failures(Request $request): JsonResponse
    {
        [$fromDate, $toDate] = $this->resolvedRange($request);

        $failuresByEquipment = Failure::query()
            ->whereHas('shift', fn (Builder $query) => $this->constrainShiftDateRange($query, $fromDate, $toDate))
            ->selectRaw("COALESCE(NULLIF(TRIM(equipment_name), ''), 'Unspecified') as equipment_name")
            ->selectRaw('COUNT(*) as failures_count')
            ->groupBy(DB::raw("COALESCE(NULLIF(TRIM(equipment_name), ''), 'Unspecified')"))
            ->orderByDesc('failures_count')
            ->orderBy('equipment_name')
            ->get()
            ->map(fn (Failure $failure): array => [
                'equipment_name' => (string) $failure->equipment_name,
                'failures_count' => (int) $failure->failures_count,
            ])
            ->all();

        return response()->json([
            'failures_by_equipment' => $failuresByEquipment,
        ]);
    }

    public function temperatures(Request $request): JsonResponse
    {
        [$fromDate, $toDate] = $this->resolvedRange($request);

        $meatTemperatureByDate = $this->constrainShiftDateRange(Shift::query(), $fromDate, $toDate)
            ->select('shift_date')
            ->selectRaw('AVG(meat_temp_c) as meat_temp_c')
            ->whereNotNull('meat_temp_c')
            ->groupBy('shift_date')
            ->orderBy('shift_date')
            ->get()
            ->map(fn (Shift $shift): array => [
                'shift_date' => $shift->shift_date->toDateString(),
                'meat_temp_c' => $this->roundNullable($shift->meat_temp_c),
            ])
            ->all();

        return response()->json([
            'meat_temperature_by_date' => $meatTemperatureByDate,
        ]);
    }

    private function resolvedRange(Request $request): array
    {
        $fromDate = $this->normalizedDate($request->query('from'));
        $toDate = $this->normalizedDate($request->query('to'));

        if ($fromDate !== null || $toDate !== null) {
            return [
                $fromDate ?? $toDate,
                $toDate ?? $fromDate,
            ];
        }

        $range = WorkWeek::datesFor();

        return [$range['from'], $range['to']];
    }

    private function normalizedDate(mixed $value): ?string
    {
        if (! is_string($value) || trim($value) === '') {
            return null;
        }

        try {
            return \Carbon\Carbon::parse($value)->toDateString();
        } catch (\Throwable) {
            return null;
        }
    }

    private function roundNullable(mixed $value): ?float
    {
        if ($value === null) {
            return null;
        }

        return round((float) $value, 2);
    }

    private function constrainShiftDateRange(Builder $query, string $fromDate, string $toDate): Builder
    {
        return $query
            ->whereDate('shift_date', '>=', $fromDate)
            ->whereDate('shift_date', '<=', $toDate);
    }
}
