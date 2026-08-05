<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreEquipmentWorkLogRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'performed_on' => ['required', 'date'],
            'action' => ['required', 'string', 'max:1000'],
            'parts_used' => ['nullable', 'string', 'max:1000'],
            'notes' => ['nullable', 'string', 'max:4000'],
        ];
    }
}
