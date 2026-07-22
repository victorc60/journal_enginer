<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Equipment;
use App\Models\Failure;
use App\Models\HandoverItem;
use App\Models\MaintenanceEvent;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

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
            'failures_count' => Failure::query()->where('equipment_id', $equipment->id)->count(),
            'maintenance_count' => MaintenanceEvent::query()->where('equipment_id', $equipment->id)->count(),
            'open_handover_items_count' => HandoverItem::query()
                ->where('equipment_id', $equipment->id)
                ->whereIn('status', [HandoverItem::STATUS_OPEN, HandoverItem::STATUS_IN_PROGRESS])
                ->count(),
            'total_downtime_minutes' => (int) (Failure::query()
                ->where('equipment_id', $equipment->id)
                ->sum('downtime_minutes') ?? 0),
            'top_repeated_problems' => Failure::query()
                ->selectRaw('problem, COUNT(*) as problem_count')
                ->where('equipment_id', $equipment->id)
                ->whereNotNull('problem')
                ->groupBy('problem')
                ->orderByDesc('problem_count')
                ->orderBy('problem')
                ->limit(5)
                ->get()
                ->map(fn (Failure $failure): array => [
                    'problem' => $failure->problem,
                    'count' => (int) $failure->problem_count,
                ])
                ->all(),
            'recent_parts_used' => MaintenanceEvent::query()
                ->selectRaw("COALESCE(NULLIF(TRIM(parts_used), ''), 'Unspecified') as parts_used")
                ->selectRaw('COUNT(*) as uses_count')
                ->where('equipment_id', $equipment->id)
                ->whereNotNull('parts_used')
                ->groupBy(DB::raw("COALESCE(NULLIF(TRIM(parts_used), ''), 'Unspecified')"))
                ->orderByDesc('uses_count')
                ->orderBy('parts_used')
                ->limit(5)
                ->get()
                ->map(fn (MaintenanceEvent $event): array => [
                    'parts_used' => (string) $event->parts_used,
                    'count' => (int) $event->uses_count,
                ])
                ->all(),
        ];

        return response()->json([
            'equipment' => $equipment,
            'summary' => $summary,
        ]);
    }
}
