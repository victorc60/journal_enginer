<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreMorningRoundRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'round_date' => ['required', 'date'],
            'is_slaughter_day' => ['required', 'boolean'],
            'entries' => ['required', 'array'],
            'entries.*.morning_round_item_id' => ['required', 'integer', 'distinct', 'exists:morning_round_items,id'],
            'entries.*.is_checked' => ['required', 'boolean'],
            'entries.*.note' => ['nullable', 'string'],
        ];
    }
}
