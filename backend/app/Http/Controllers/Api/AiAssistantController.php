<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AskAiQuestionRequest;
use App\Services\AiAssistantService;
use Illuminate\Http\JsonResponse;

class AiAssistantController extends Controller
{
    public function ask(AskAiQuestionRequest $request, AiAssistantService $assistant): JsonResponse
    {
        $validated = $request->validated();
        $answer = $assistant->ask($validated['question'], $validated);

        return response()->json([
            'answer' => $answer,
        ]);
    }
}
