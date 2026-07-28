<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreWaterControlLogRequest;
use App\Models\WaterControlLog;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WaterControlController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $date = $this->resolveDate($request->query('date'));

        return response()->json($this->payloadForDate($date));
    }

    public function store(StoreWaterControlLogRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $logDate = $this->resolveDate($validated['log_date']);

        $log = WaterControlLog::query()->updateOrCreate(
            [
                'log_date' => $logDate->toDateString(),
            ],
            [
                'artesian_supply_start' => $validated['artesian_supply_start'] ?? null,
                'artesian_supply_end' => $validated['artesian_supply_end'] ?? null,
                'artesian_supply_used' => $this->calculateUsage(
                    $validated['artesian_supply_start'] ?? null,
                    $validated['artesian_supply_end'] ?? null,
                ),
                'pump_power_start' => $validated['pump_power_start'] ?? null,
                'pump_power_end' => $validated['pump_power_end'] ?? null,
                'pump_power_used' => $this->calculateUsage(
                    $validated['pump_power_start'] ?? null,
                    $validated['pump_power_end'] ?? null,
                ),
                'purified_water_start' => $validated['purified_water_start'] ?? null,
                'purified_water_end' => $validated['purified_water_end'] ?? null,
                'purified_water_used' => $this->calculateUsage(
                    $validated['purified_water_start'] ?? null,
                    $validated['purified_water_end'] ?? null,
                ),
                'raw_water_direct_start' => $validated['raw_water_direct_start'] ?? null,
                'raw_water_direct_end' => $validated['raw_water_direct_end'] ?? null,
                'raw_water_direct_used' => $this->calculateUsage(
                    $validated['raw_water_direct_start'] ?? null,
                    $validated['raw_water_direct_end'] ?? null,
                ),
                'sodium_hypochlorite_liters' => $validated['sodium_hypochlorite_liters'] ?? null,
                'antiscalant_grams' => $validated['antiscalant_grams'] ?? null,
                'notes' => $this->normalizedNullableString($validated['notes'] ?? null),
            ],
        );

        return response()->json($this->payloadForDate($logDate, $log->fresh()));
    }

    private function payloadForDate(CarbonImmutable $date, ?WaterControlLog $resolvedLog = null): array
    {
        $log = $resolvedLog ?? WaterControlLog::query()
            ->whereDate('log_date', $date->toDateString())
            ->first();

        $history = WaterControlLog::query()
            ->orderByDesc('log_date')
            ->orderByDesc('id')
            ->limit(20)
            ->get();

        return [
            'date' => $date->toDateString(),
            'log' => $log,
            'history' => $history,
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

    private function calculateUsage(mixed $start, mixed $end): ?float
    {
        if (! is_numeric((string) $start) || ! is_numeric((string) $end)) {
            return null;
        }

        return round((float) $end - (float) $start, 2);
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
