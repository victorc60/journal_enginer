<?php

namespace App\Http\Requests;

use App\Models\HandoverItem;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreManualShiftRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'shift_date' => ['required', 'date'],
            'heads_count' => ['nullable', 'integer', 'min:1'],
            'work_hours' => ['nullable', 'numeric'],
            'co2_start_kg' => ['nullable', 'numeric'],
            'co2_end_kg' => ['nullable', 'numeric'],
            'co2_used_kg' => ['nullable', 'numeric'],
            'outside_temp_c' => ['nullable', 'numeric'],
            'chiller_temp_c' => ['nullable', 'numeric'],
            'meat_temp_c' => ['nullable', 'numeric'],
            'raw_text' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
            'handover_items' => ['nullable', 'array'],
            'handover_items.*.title' => ['required_with:handover_items', 'string', 'max:160'],
            'handover_items.*.details' => ['nullable', 'string'],
            'handover_items.*.equipment_name' => ['nullable', 'string', 'max:120'],
            'handover_items.*.assigned_to' => ['nullable', 'string', 'max:120'],
            'handover_items.*.priority' => ['nullable', 'string', Rule::in(HandoverItem::PRIORITIES)],
            'handover_items.*.status' => ['nullable', 'string', Rule::in(HandoverItem::STATUSES)],
            'handover_items.*.due_date' => ['nullable', 'date'],
            'handover_items.*.resolution_notes' => ['nullable', 'string'],
        ];
    }
}
