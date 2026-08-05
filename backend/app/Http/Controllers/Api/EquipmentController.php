<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreEquipmentWorkLogRequest;
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
                'workLogs',
                'handoverItems as open_handover_items_count' => fn ($query) => $query->whereIn('status', [
                    HandoverItem::STATUS_OPEN,
                    HandoverItem::STATUS_IN_PROGRESS,
                ]),
            ])
            ->orderBy('name')
            ->get();

        return response()->json($equipment->map(function (Equipment $item): array {
            $payload = $item->toArray();
            $payload['work_history_count'] = (int) $item->failures_count + (int) $item->maintenance_events_count + (int) $item->work_logs_count;

            return $payload;
        })->all());
    }

    public function show(Equipment $equipment): JsonResponse
    {
        $failuresCount = Failure::query()->where('equipment_id', $equipment->id)->count();
        $maintenanceCount = MaintenanceEvent::query()->where('equipment_id', $equipment->id)->count();
        $manualWorkLogsCount = $equipment->workLogs()->count();

        $equipment->load([
            'failures' => fn ($query) => $query
                ->with('shift:id,shift_date')
                ->orderByDesc('id')
                ->limit(20),
            'maintenanceEvents' => fn ($query) => $query
                ->with('shift:id,shift_date')
                ->orderByDesc('id')
                ->limit(20),
            'workLogs' => fn ($query) => $query
                ->orderByDesc('performed_on')
                ->orderByDesc('id')
                ->limit(30),
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
            'manual_work_logs_count' => $manualWorkLogsCount,
            'work_history_count' => $failuresCount + $maintenanceCount + $manualWorkLogsCount,
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

    public function storeWorkLog(StoreEquipmentWorkLogRequest $request, Equipment $equipment): JsonResponse
    {
        $workLog = $equipment->workLogs()->create($request->validated());

        return response()->json([
            'message' => 'Работа по узлу сохранена.',
            'work_log' => [
                'id' => $workLog->id,
                'equipment_id' => $workLog->equipment_id,
                'performed_on' => $workLog->performed_on?->toDateString(),
                'action' => $workLog->action,
                'parts_used' => $workLog->parts_used,
                'notes' => $workLog->notes,
                'created_at' => $workLog->created_at?->toISOString(),
                'updated_at' => $workLog->updated_at?->toISOString(),
            ],
        ], 201);
    }
}
