<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\TranscribeAudioRequest;
use App\Services\AiTranscriptionService;
use Illuminate\Http\JsonResponse;

class TranscriptionController extends Controller
{
    public function store(TranscribeAudioRequest $request, AiTranscriptionService $transcription): JsonResponse
    {
        $file = $request->file('audio');
        $text = $transcription->transcribe($file);

        return response()->json([
            'text' => $text,
        ]);
    }
}
