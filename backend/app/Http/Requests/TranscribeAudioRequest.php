<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class TranscribeAudioRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'audio' => [
                'required',
                'file',
                'max:25600',
                'mimes:flac,mp3,mp4,mpeg,mpga,m4a,ogg,wav,webm',
            ],
        ];
    }
}
