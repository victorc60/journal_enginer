<?php

namespace App\Http\Requests;

use App\Models\HandoverItem;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateHandoverItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status' => ['sometimes', 'string', Rule::in(HandoverItem::STATUSES)],
            'priority' => ['sometimes', 'string', Rule::in(HandoverItem::PRIORITIES)],
            'assigned_to' => ['sometimes', 'nullable', 'string', 'max:120'],
            'due_date' => ['sometimes', 'nullable', 'date'],
            'resolution_notes' => ['sometimes', 'nullable', 'string'],
            'details' => ['sometimes', 'nullable', 'string'],
            'title' => ['sometimes', 'string', 'max:160'],
        ];
    }
}
