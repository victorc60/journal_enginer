<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

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
        ];
    }
}
