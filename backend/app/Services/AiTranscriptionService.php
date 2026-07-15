<?php

namespace App\Services;

use Illuminate\Http\Client\RequestException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class AiTranscriptionService
{
    public function transcribe(UploadedFile $file): string
    {
        $apiKey = (string) config('services.openai.api_key');
        $baseUrl = (string) config('services.openai.base_url');
        $model = (string) config('services.openai.transcription_model', 'gpt-4o-transcribe');

        if ($apiKey === '') {
            throw new RuntimeException('OPENAI_API_KEY is not configured.');
        }

        $stream = fopen($file->getRealPath(), 'r');

        if ($stream === false) {
            throw new RuntimeException('Unable to read uploaded audio.');
        }

        try {
            $response = Http::baseUrl(rtrim($baseUrl, '/'))
                ->withToken($apiKey)
                ->acceptJson()
                ->attach(
                    'file',
                    $stream,
                    $file->getClientOriginalName(),
                )
                ->post('/audio/transcriptions', [
                    'model' => $model,
                    'response_format' => 'json',
                ]);

            $response->throw();
        } catch (RequestException $exception) {
            $message = $exception->response?->json('error.message') ?? 'OpenAI transcription request failed.';

            throw new RuntimeException($message, previous: $exception);
        } finally {
            fclose($stream);
        }

        $text = trim((string) $response->json('text', ''));

        if ($text === '') {
            throw new RuntimeException('OpenAI did not return transcript text.');
        }

        return $text;
    }
}
