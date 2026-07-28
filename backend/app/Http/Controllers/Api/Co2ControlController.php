<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Shift;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class Co2ControlController extends Controller
{
    private const STORAGE_CAPACITY_KG = 50000;

    public function index(Request $request): JsonResponse
    {
        $shifts = Shift::query()
            ->when($this->normalizedDate($request->query('from')) !== null, function ($query) use ($request): void {
                $query->whereDate('shift_date', '>=', $this->normalizedDate($request->query('from')));
            })
            ->when($this->normalizedDate($request->query('to')) !== null, function ($query) use ($request): void {
                $query->whereDate('shift_date', '<=', $this->normalizedDate($request->query('to')));
            })
            ->where(function ($query): void {
                $query
                    ->whereNotNull('co2_start_kg')
                    ->orWhereNotNull('co2_end_kg')
                    ->orWhereNotNull('co2_used_kg')
                    ->orWhereNotNull('co2_per_head_g');
            })
            ->orderByDesc('shift_date')
            ->orderByDesc('id')
            ->get();

        $rows = $shifts->map(function (Shift $shift): array {
            $remainingKg = $this->roundNullable($shift->co2_end_kg);

            return [
                'id' => $shift->id,
                'shift_date' => $shift->shift_date?->toDateString(),
                'heads_count' => $shift->heads_count,
                'co2_start_kg' => $this->roundNullable($shift->co2_start_kg),
                'co2_end_kg' => $remainingKg,
                'co2_used_kg' => $this->roundNullable($shift->co2_used_kg),
                'co2_per_head_g' => $this->roundNullable($shift->co2_per_head_g),
                'remaining_tons' => $remainingKg !== null ? round($remainingKg / 1000, 2) : null,
                'storage_fill_percent' => $remainingKg !== null
                    ? round(($remainingKg / self::STORAGE_CAPACITY_KG) * 100, 2)
                    : null,
            ];
        })->values();

        $latestRowWithRemaining = $rows->first(fn (array $row): bool => $row['co2_end_kg'] !== null);

        return response()->json([
            'summary' => [
                'tracked_shifts_count' => $rows->count(),
                'total_heads_count' => $shifts->sum(fn (Shift $shift): int => (int) ($shift->heads_count ?? 0)),
                'total_co2_used_kg' => round(
                    $shifts->sum(fn (Shift $shift): float => (float) ($shift->co2_used_kg ?? 0)),
                    2
                ),
                'average_co2_per_head_g' => $this->roundNullable(
                    $shifts->filter(fn (Shift $shift): bool => $shift->co2_per_head_g !== null)->avg(
                        fn (Shift $shift): float => (float) $shift->co2_per_head_g
                    )
                ),
                'latest_remaining_kg' => $latestRowWithRemaining['co2_end_kg'] ?? null,
                'latest_remaining_tons' => $latestRowWithRemaining['remaining_tons'] ?? null,
                'latest_fill_percent' => $latestRowWithRemaining['storage_fill_percent'] ?? null,
                'storage_capacity_kg' => self::STORAGE_CAPACITY_KG,
            ],
            'rows' => $rows->all(),
        ]);
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

    private function roundNullable(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        return round((float) $value, 2);
    }
}
