<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Shift;
use Illuminate\Http\JsonResponse;

class ShiftHistoryController extends Controller
{
    public function index(): JsonResponse
    {
        $shifts = Shift::query()
            ->orderByDesc('shift_date')
            ->orderByDesc('id')
            ->get();

        return response()->json($shifts);
    }

    public function show(Shift $shift): JsonResponse
    {
        $shift->load([
            'failures',
            'maintenanceEvents',
            'shiftNotes',
        ]);

        return response()->json($shift);
    }
}
