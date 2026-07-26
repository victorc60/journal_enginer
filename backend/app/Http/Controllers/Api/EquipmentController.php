<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Equipment;
use App\Models\Failure;
use App\Models\HandoverItem;
use App\Models\MaintenanceEvent;
use Illuminate\Http\JsonResponse;

class EquipmentController extends Controller
{
    public function index(): JsonResponse
    {
        $equipment = Equipment::query()
            ->withCount([
                'failures',
                'maintenanceEvents',
                'handoverItems as open_handover_items_count' => fn ($query) => $query->whereIn('status', [
                    HandoverItem::STATUS_OPEN,
                    HandoverItem::STATUS_IN_PROGRESS,
                ]),
            ])
            ->orderBy('name')
            ->get();

        return response()->json($equipment);
    }

    public function show(Equipment $equipment): JsonResponse
    {
        $failuresCount = Failure::query()->where('equipment_id', $equipment->id)->count();
        $maintenanceCount = MaintenanceEvent::query()->where('equipment_id', $equipment->id)->count();

        $equipment->load([
            'failures' => fn ($query) => $query
                ->with('shift:id,shift_date')
                ->orderByDesc('id')
                ->limit(20),
            'maintenanceEvents' => fn ($query) => $query
                ->with('shift:id,shift_date')
                ->orderByDesc('id')
                ->limit(20),
            'handoverItems' => fn ($query) => $query
                ->with('shift:id,shift_date')
                ->orderByRaw("
                    CASE status
                        WHEN 'open' THEN 1
                        WHEN 'in_progress' THEN 2
                        WHEN 'resolved' THEN 3
                        ELSE 4
                    END
                ")
                ->orderBy('due_date')
                ->orderByDesc('id')
                ->limit(20),
        ]);

        $summary = [
            'failures_count' => $failuresCount,
            'maintenance_count' => $maintenanceCount,
            'work_history_count' => $failuresCount + $maintenanceCount,
            'open_handover_items_count' => HandoverItem::query()
                ->where('equipment_id', $equipment->id)
                ->whereIn('status', [HandoverItem::STATUS_OPEN, HandoverItem::STATUS_IN_PROGRESS])
                ->count(),
        ];

        return response()->json([
            'equipment' => $equipment,
            'summary' => $summary,
        ]);
    }
}
