<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ParseShiftTextRequest;
use App\Models\Equipment;
use App\Models\HandoverItem;
use App\Models\Shift;
use App\Services\AiShiftParserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AiShiftController extends Controller
{
    public function preview(ParseShiftTextRequest $request, AiShiftParserService $parser): JsonResponse
    {
        $text = $this->extractOriginalText($request);
        $parsed = $parser->parse($text);

        return response()->json([
            'raw_text' => $text,
            'parsed' => $parsed,
        ]);
    }

    public function store(ParseShiftTextRequest $request, AiShiftParserService $parser): JsonResponse
    {
        $text = $this->extractOriginalText($request);
        $parsed = $parser->parse($text);

        $shift = DB::transaction(function () use ($parsed, $text): Shift {
            $shift = Shift::query()->create([
                'shift_date' => $parsed['shift_date'],
                'heads_count' => $parsed['heads_count'],
                'work_hours' => $parsed['work_hours'],
                'co2_start_kg' => $parsed['co2_start_kg'],
                'co2_end_kg' => $parsed['co2_end_kg'],
                'co2_used_kg' => $parsed['co2_used_kg'],
                'co2_per_head_g' => $parsed['co2_per_head_g'],
                'outside_temp_c' => $parsed['outside_temp_c'],
                'chiller_temp_c' => $parsed['chiller_temp_c'],
                'meat_temp_c' => $parsed['meat_temp_c'],
                'raw_text' => $text,
                'notes' => $parsed['notes'],
            ]);

            $this->storeShiftNotes($shift, $parsed['categorized_notes']);
            $this->storeFailures($shift, $parsed['failures']);
            $this->storeMaintenanceEvents($shift, $parsed['maintenance_events']);
            $this->storeHandoverItems($shift, $parsed['handover_items']);

            return $shift->load([
                'failures',
                'maintenanceEvents',
                'shiftNotes',
                'handoverItems',
                'attachments',
            ]);
        });

        return response()->json($shift, 201);
    }

    private function storeShiftNotes(Shift $shift, array $notes): void
    {
        if ($notes === []) {
            return;
        }

        $shift->shiftNotes()->createMany(
            array_map(function (array $note): array {
                return [
                    'category' => $note['category'],
                    'content' => $note['content'],
                ];
            }, $notes),
        );
    }

    private function storeFailures(Shift $shift, array $failures): void
    {
        if ($failures === []) {
            return;
        }

        $shift->failures()->createMany(
            array_map(function (array $failure): array {
                return [
                    'equipment_id' => $this->resolveEquipmentId($failure['equipment_name'] ?? null),
                    'equipment_name' => $failure['equipment_name'] ?? null,
                    'problem' => $failure['problem'],
                    'cause' => $failure['cause'] ?? null,
                    'solution' => $failure['solution'] ?? null,
                    'downtime_minutes' => $failure['downtime_minutes'] ?? null,
                    'severity' => $failure['severity'] ?? null,
                    'status' => ($failure['solution'] ?? null) ? 'resolved' : 'open',
                ];
            }, $failures),
        );
    }

    private function storeMaintenanceEvents(Shift $shift, array $events): void
    {
        if ($events === []) {
            return;
        }

        $shift->maintenanceEvents()->createMany(
            array_map(function (array $event): array {
                return [
                    'equipment_id' => $this->resolveEquipmentId($event['equipment_name'] ?? null),
                    'equipment_name' => $event['equipment_name'] ?? null,
                    'action' => $event['action'],
                    'parts_used' => $event['parts_used'] ?? null,
                    'notes' => $event['notes'] ?? null,
                ];
            }, $events),
        );
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
                    'status' => HandoverItem::STATUS_OPEN,
                    'priority' => $item['priority'] ?? HandoverItem::PRIORITY_NORMAL,
                    'assigned_to' => $item['assigned_to'] ?? null,
                    'due_date' => $item['due_date'] ?? null,
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

    private function extractOriginalText(ParseShiftTextRequest $request): string
    {
        $payload = json_decode($request->getContent(), true);

        if (is_array($payload) && array_key_exists('text', $payload) && is_string($payload['text'])) {
            return $payload['text'];
        }

        return $request->validated()['text'];
    }
}
