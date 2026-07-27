<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreMorningRoundItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'section' => ['required', 'string', 'max:120'],
            'title' => ['required', 'string', 'max:160'],
            'details' => ['nullable', 'string'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'section' => is_string($this->input('section')) ? trim($this->input('section')) : $this->input('section'),
            'title' => is_string($this->input('title')) ? trim($this->input('title')) : $this->input('title'),
        ]);
    }
}
