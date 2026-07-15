<?php

return [
    'openai' => [
        'api_key' => env('OPENAI_API_KEY'),
        'base_url' => env('OPENAI_BASE_URL', 'https://api.openai.com/v1'),
        'model' => env('OPENAI_MODEL', 'gpt-5.5'),
        'transcription_model' => env('OPENAI_TRANSCRIPTION_MODEL', 'gpt-4o-transcribe'),
    ],
];
