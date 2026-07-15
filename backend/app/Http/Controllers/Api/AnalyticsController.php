<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Failure;
use App\Models\Shift;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    public function summary(): JsonResponse
    {
        $summary = Shift::query()
            ->selectRaw('COUNT(*) as total_shifts')
            ->selectRaw('AVG(heads_count) as average_heads_count')
            ->selectRaw('AVG(co2_per_head_g) as average_co2_per_head_g')
            ->first();

        return response()->json([
            'total_shifts' => (int) ($summary?->total_shifts ?? 0),
            'average_heads_count' => $this->roundNullable($summary?->average_heads_count),
            'average_co2_per_head_g' => $this->roundNullable($summary?->average_co2_per_head_g),
            'total_failures' => Failure::query()->count(),
        ]);
    }

    public function co2(): JsonResponse
    {
        $co2UsageByDate = Shift::query()
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

        $co2PerHeadByDate = Shift::query()
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

    public function failures(): JsonResponse
    {
        $failuresByEquipment = Failure::query()
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

    public function temperatures(): JsonResponse
    {
        $meatTemperatureByDate = Shift::query()
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

    private function roundNullable(mixed $value): ?float
    {
        if ($value === null) {
            return null;
        }

        return round((float) $value, 2);
    }
}
