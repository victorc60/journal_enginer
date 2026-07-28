<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreWaterControlLogRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'log_date' => ['required', 'date'],
            'artesian_supply_start' => ['nullable', 'numeric'],
            'artesian_supply_end' => ['nullable', 'numeric', 'gte:artesian_supply_start'],
            'pump_power_start' => ['nullable', 'numeric'],
            'pump_power_end' => ['nullable', 'numeric', 'gte:pump_power_start'],
            'purified_water_start' => ['nullable', 'numeric'],
            'purified_water_end' => ['nullable', 'numeric', 'gte:purified_water_start'],
            'raw_water_direct_start' => ['nullable', 'numeric'],
            'raw_water_direct_end' => ['nullable', 'numeric', 'gte:raw_water_direct_start'],
            'sodium_hypochlorite_liters' => ['nullable', 'numeric', 'min:0'],
            'antiscalant_grams' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
