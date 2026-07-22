<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreManualShiftRequest;
use App\Models\Equipment;
use App\Models\HandoverItem;
use App\Models\Shift;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

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

        $handoverItems = $validated['handover_items'] ?? [];
        unset($validated['handover_items']);

        $shift = DB::transaction(function () use ($validated, $handoverItems): Shift {
            $shift = Shift::query()->create($validated);
            $this->storeHandoverItems($shift, $handoverItems);

            return $shift->load([
                'handoverItems',
                'attachments',
            ]);
        });

        return response()->json($shift, 201);
    }

    private function storeHandoverItems(Shift $shift, array $items): void
    {
        if ($items === []) {
            return;
        }

        $shift->handoverItems()->createMany(
            array_map(function (array $item): array {
                return [
                    'equipment_id' => $this->resolveEquipmentId($item['equipment_name'] ?? null),
                    'equipment_name' => $item['equipment_name'] ?? null,
                    'title' => $item['title'],
                    'details' => $item['details'] ?? null,
                    'status' => $item['status'] ?? HandoverItem::STATUS_OPEN,
                    'priority' => $item['priority'] ?? HandoverItem::PRIORITY_NORMAL,
                    'assigned_to' => $item['assigned_to'] ?? null,
                    'due_date' => $item['due_date'] ?? null,
                    'resolution_notes' => $item['resolution_notes'] ?? null,
                ];
            }, $items),
        );
    }

    private function resolveEquipmentId(?string $equipmentName): ?int
    {
        if ($equipmentName === null || trim($equipmentName) === '') {
            return null;
        }

        return Equipment::query()
            ->whereRaw('LOWER(name) = ?', [mb_strtolower($equipmentName)])
            ->value('id');
    }
}
