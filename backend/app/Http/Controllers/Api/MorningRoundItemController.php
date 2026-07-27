<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMorningRoundItemRequest;
use App\Http\Requests\UpdateMorningRoundItemRequest;
use App\Models\MorningRoundItem;
use Illuminate\Http\JsonResponse;

class MorningRoundItemController extends Controller
{
    public function store(StoreMorningRoundItemRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $item = MorningRoundItem::query()->create([
            'section' => trim($validated['section']),
            'title' => trim($validated['title']),
            'details' => $this->normalizedNullableString($validated['details'] ?? null),
            'sort_order' => $validated['sort_order'] ?? ((MorningRoundItem::query()->max('sort_order') ?? 0) + 10),
            'is_active' => true,
        ]);

        return response()->json($item, 201);
    }

    public function update(UpdateMorningRoundItemRequest $request, MorningRoundItem $morningRoundItem): JsonResponse
    {
        $validated = $request->validated();

        if (array_key_exists('section', $validated)) {
            $validated['section'] = trim($validated['section']);
        }

        if (array_key_exists('title', $validated)) {
            $validated['title'] = trim($validated['title']);
        }

        if (array_key_exists('details', $validated)) {
            $validated['details'] = $this->normalizedNullableString($validated['details']);
        }

        $morningRoundItem->fill($validated);
        $morningRoundItem->save();

        return response()->json($morningRoundItem->fresh());
    }

    public function destroy(MorningRoundItem $morningRoundItem): JsonResponse
    {
        $morningRoundItem->update([
            'is_active' => false,
        ]);

        return response()->json($morningRoundItem->fresh());
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
