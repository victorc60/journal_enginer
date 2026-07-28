<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreEveningPrepRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'prep_date' => ['required', 'date'],
            'is_next_day_slaughter' => ['required', 'boolean'],
            'entries' => ['required', 'array'],
            'entries.*.evening_prep_item_id' => ['required', 'integer', 'distinct', 'exists:evening_prep_items,id'],
            'entries.*.is_checked' => ['required', 'boolean'],
            'entries.*.note' => ['nullable', 'string'],
        ];
    }
}
