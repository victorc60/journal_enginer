<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateHandoverItemRequest;
use App\Models\HandoverItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HandoverController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $items = HandoverItem::query()
            ->with([
                'shift:id,shift_date',
            ])
            ->when($this->normalized($request->query('status')) !== null, function ($query) use ($request): void {
                $status = $this->normalized($request->query('status'));
                $query->where('status', $status);
            })
            ->when($this->normalized($request->query('equipment')) !== null, function ($query) use ($request): void {
                $equipment = $this->normalized($request->query('equipment'));
                $query->where(function ($equipmentQuery) use ($equipment): void {
                    $equipmentQuery
                        ->whereRaw('LOWER(COALESCE(equipment_name, \'\')) like ?', ['%'.$equipment.'%'])
                        ->orWhereHas('equipment', function ($query) use ($equipment): void {
                            $query->whereRaw('LOWER(name) like ?', ['%'.$equipment.'%']);
                        });
                });
            })
            ->when($this->normalized($request->query('priority')) !== null, function ($query) use ($request): void {
                $priority = $this->normalized($request->query('priority'));
                $query->where('priority', $priority);
            })
            ->orderByRaw("
                CASE priority
                    WHEN 'urgent' THEN 1
                    WHEN 'high' THEN 2
                    WHEN 'normal' THEN 3
                    WHEN 'low' THEN 4
                    ELSE 5
                END
            ")
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
            ->get();

        return response()->json($items);
    }

    public function update(UpdateHandoverItemRequest $request, HandoverItem $handoverItem): JsonResponse
    {
        $validated = $request->validated();

        $handoverItem->fill($validated);

        if (array_key_exists('status', $validated)) {
            if ($validated['status'] === HandoverItem::STATUS_RESOLVED) {
                $handoverItem->resolved_at = $handoverItem->resolved_at ?? now();
            } else {
                $handoverItem->resolved_at = null;
            }
        }

        $handoverItem->save();
        $handoverItem->load([
            'shift:id,shift_date',
        ]);

        return response()->json($handoverItem);
    }

    private function normalized(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $normalized = mb_strtolower(trim($value));

        return $normalized === '' ? null : $normalized;
    }
}
