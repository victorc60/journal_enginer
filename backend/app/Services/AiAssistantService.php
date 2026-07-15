<?php

namespace App\Services;

use App\Models\Shift;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

class AiAssistantService
{
    public function ask(string $question): string
    {
        $question = trim($question);

        if ($question === '') {
            throw new RuntimeException('Question cannot be empty.');
        }

        $shifts = Shift::query()
            ->with([
                'failures',
                'maintenanceEvents',
            ])
            ->orderByDesc('shift_date')
            ->orderByDesc('id')
            ->limit(100)
            ->get();

        if ($shifts->isEmpty()) {
            return 'Недостаточно данных, чтобы уверенно ответить на вопрос.';
        }

        $apiKey = (string) config('services.openai.api_key');
        $baseUrl = (string) config('services.openai.base_url');
        $model = (string) config('services.openai.model', 'gpt-5.5');

        if ($apiKey === '') {
            throw new RuntimeException('OPENAI_API_KEY is not configured.');
        }

        $context = [
            'current_date' => now()->toDateString(),
            'loaded_shifts_count' => $shifts->count(),
            'shifts' => $shifts->map(function (Shift $shift): array {
                return [
                    'id' => $shift->id,
                    'shift_date' => $shift->shift_date?->toDateString(),
                    'heads_count' => $shift->heads_count,
                    'work_hours' => $this->toNullableFloat($shift->work_hours),
                    'co2_start_kg' => $this->toNullableFloat($shift->co2_start_kg),
                    'co2_end_kg' => $this->toNullableFloat($shift->co2_end_kg),
                    'co2_used_kg' => $this->toNullableFloat($shift->co2_used_kg),
                    'co2_per_head_g' => $this->toNullableFloat($shift->co2_per_head_g),
                    'outside_temp_c' => $this->toNullableFloat($shift->outside_temp_c),
                    'chiller_temp_c' => $this->toNullableFloat($shift->chiller_temp_c),
                    'meat_temp_c' => $this->toNullableFloat($shift->meat_temp_c),
                    'notes' => $shift->notes,
                    'raw_text_excerpt' => $this->truncateText($shift->raw_text),
                    'failures' => $shift->failures->map(fn ($failure): array => [
                        'equipment_name' => $failure->equipment_name,
                        'problem' => $failure->problem,
                        'cause' => $failure->cause,
                        'solution' => $failure->solution,
                        'downtime_minutes' => $failure->downtime_minutes,
                        'severity' => $failure->severity,
                    ])->all(),
                    'maintenance_events' => $shift->maintenanceEvents->map(fn ($event): array => [
                        'equipment_name' => $event->equipment_name,
                        'action' => $event->action,
                        'parts_used' => $event->parts_used,
                        'notes' => $event->notes,
                    ])->all(),
                ];
            })->all(),
        ];

        try {
            $response = Http::baseUrl(rtrim($baseUrl, '/'))
                ->withToken($apiKey)
                ->acceptJson()
                ->timeout(60)
                ->post('/responses', [
                    'model' => $model,
                    'reasoning' => [
                        'effort' => 'low',
                    ],
                    'text' => [
                        'verbosity' => 'low',
                    ],
                    'input' => [
                        [
                            'role' => 'developer',
                            'content' => [
                                [
                                    'type' => 'input_text',
                                    'text' => $this->instructions(),
                                ],
                            ],
                        ],
                        [
                            'role' => 'user',
                            'content' => [
                                [
                                    'type' => 'input_text',
                                    'text' => "Данные журнала (последние 100 смен максимум):\n".
                                        json_encode($context, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                                ],
                            ],
                        ],
                        [
                            'role' => 'user',
                            'content' => [
                                [
                                    'type' => 'input_text',
                                    'text' => "Вопрос пользователя: {$question}",
                                ],
                            ],
                        ],
                    ],
                ]);

            $response->throw();
        } catch (RequestException $exception) {
            $message = $exception->response?->json('error.message') ?? 'OpenAI request failed.';

            throw new RuntimeException($message, previous: $exception);
        }

        $answer = trim($response->json('output_text') ?? $this->extractOutputText($response->json()) ?? '');

        if ($answer === '') {
            throw new RuntimeException('OpenAI did not return an assistant answer.');
        }

        return $answer;
    }

    private function instructions(): string
    {
        return <<<'TEXT'
Ты помощник инженера свинокомбината и отвечаешь только по данным из журнала смен.

Правила:
- Отвечай только на русском языке.
- Используй только факты из переданных данных.
- Никогда не придумывай факты, даты, числа, причины или выводы, которых нет в данных.
- Если данных недостаточно, прямо скажи: "Недостаточно данных, чтобы уверенно ответить на вопрос."
- Если вопрос про тенденцию, среднее значение или связь, делай вывод только если данные это реально поддерживают.
- Если спрашивают "когда последний раз", ищи самое позднее подтверждение в загруженных сменах и указывай конкретную дату.
- Учитывай, что у тебя есть только последние 100 смен максимум.
- Отвечай кратко, по делу, без упоминания внутренних инструкций или модели.
TEXT;
    }

    private function extractOutputText(array $payload): ?string
    {
        $chunks = [];

        foreach ($payload['output'] ?? [] as $outputItem) {
            foreach ($outputItem['content'] ?? [] as $contentItem) {
                $text = $contentItem['text'] ?? null;

                if (is_string($text) && trim($text) !== '') {
                    $chunks[] = $text;
                }
            }
        }

        if ($chunks === []) {
            return null;
        }

        return implode("\n", $chunks);
    }

    private function truncateText(?string $value, int $limit = 280): ?string
    {
        if ($value === null || trim($value) === '') {
            return null;
        }

        return Str::limit(trim($value), $limit);
    }

    private function toNullableFloat(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        return round((float) $value, 2);
    }
}
