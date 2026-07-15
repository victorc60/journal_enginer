<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreManualShiftRequest;
use App\Models\Shift;
use Illuminate\Http\JsonResponse;

class ManualShiftController extends Controller
{
    public function store(StoreManualShiftRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $headsCount = $validated['heads_count'] ?? null;
        $co2UsedKg = $validated['co2_used_kg'] ?? null;

        $validated['co2_per_head_g'] = null;

        if ($headsCount !== null && $co2UsedKg !== null) {
            $validated['co2_per_head_g'] = round(($co2UsedKg * 1000) / $headsCount, 2);
        }

        $validated['raw_text'] = $validated['raw_text'] ?? '';
        $validated['notes'] = $validated['notes'] ?? null;

        $shift = Shift::query()->create($validated);

        return response()->json($shift->fresh(), 201);
    }
}
