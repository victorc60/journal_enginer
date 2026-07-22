<?php

namespace App\Http\Requests;

use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AskAiQuestionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'question' => [
                'required',
                'string',
                function (string $attribute, mixed $value, Closure $fail): void {
                    if (! is_string($value) || trim($value) === '') {
                        $fail('The '.$attribute.' field is required.');
                    }
                },
            ],
            'scenario' => [
                'nullable',
                'string',
                Rule::in([
                    'freeform',
                    'weekly_summary',
                    'repeated_failures',
                    'co2_watch',
                    'handover_digest',
                    'equipment_focus',
                    'shift_compare',
                ]),
            ],
            'equipment_name' => ['nullable', 'string', 'max:120'],
            'shift_id' => ['nullable', 'integer', 'min:1'],
            'from_date' => ['nullable', 'date'],
            'to_date' => ['nullable', 'date'],
        ];
    }
}
