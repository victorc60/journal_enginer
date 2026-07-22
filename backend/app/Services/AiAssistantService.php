<?php

namespace App\Services;

use App\Models\HandoverItem;
use App\Models\Shift;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

class AiAssistantService
{
    public function ask(string $question, array $options = []): string
    {
        $question = trim($question);

        if ($question === '') {
            throw new RuntimeException('Question cannot be empty.');
        }

        $scenario = $this->normalizeScenario($options['scenario'] ?? null);
        $equipmentName = $this->normalized($options['equipment_name'] ?? null);
        $shiftId = isset($options['shift_id']) ? (int) $options['shift_id'] : null;
        $fromDate = $this->normalizedDate($options['from_date'] ?? null);
        $toDate = $this->normalizedDate($options['to_date'] ?? null);

        $shiftQuery = Shift::query()
            ->with([
                'failures',
                'maintenanceEvents',
                'handoverItems',
            ])
            ->orderByDesc('shift_date')
            ->orderByDesc('id');

        if ($shiftId !== null && $shiftId > 0) {
            $shiftQuery->whereKey($shiftId);
        }

        if ($fromDate !== null) {
            $shiftQuery->whereDate('shift_date', '>=', $fromDate);
        }

        if ($toDate !== null) {
            $shiftQuery->whereDate('shift_date', '<=', $toDate);
        }

        if ($equipmentName !== null) {
            $shiftQuery->where(function (Builder $query) use ($equipmentName): void {
                $like = '%'.$equipmentName.'%';

                $query
                    ->whereHas('failures', fn (Builder $failureQuery) => $failureQuery
                        ->whereRaw('LOWER(COALESCE(equipment_name, \'\')) like ?', [$like]))
                    ->orWhereHas('maintenanceEvents', fn (Builder $maintenanceQuery) => $maintenanceQuery
                        ->whereRaw('LOWER(COALESCE(equipment_name, \'\')) like ?', [$like]))
                    ->orWhereHas('handoverItems', fn (Builder $handoverQuery) => $handoverQuery
                        ->whereRaw('LOWER(COALESCE(equipment_name, \'\')) like ?', [$like]));
            });
        }

        $shifts = $shiftQuery
            ->limit($scenario === 'weekly_summary' ? 21 : 100)
            ->get();

        $openHandover = HandoverItem::query()
            ->with('shift:id,shift_date')
            ->whereIn('status', [
                HandoverItem::STATUS_OPEN,
                HandoverItem::STATUS_IN_PROGRESS,
            ])
            ->when($equipmentName !== null, function ($query) use ($equipmentName): void {
                $query->whereRaw('LOWER(COALESCE(equipment_name, \'\')) like ?', ['%'.$equipmentName.'%']);
            })
            ->orderByRaw("
                CASE priority
                    WHEN 'urgent' THEN 1
                    WHEN 'high' THEN 2
                    WHEN 'normal' THEN 3
                    WHEN 'low' THEN 4
                    ELSE 5
                END
            ")
            ->orderBy('due_date')
            ->orderByDesc('id')
            ->limit(30)
            ->get();

        if ($shifts->isEmpty() && $openHandover->isEmpty()) {
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
            'scenario' => $scenario ?? 'freeform',
            'filters' => [
                'equipment_name' => $equipmentName,
                'shift_id' => $shiftId,
                'from_date' => $fromDate,
                'to_date' => $toDate,
            ],
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
                        'status' => $failure->status,
                        'assigned_to' => $failure->assigned_to,
                        'next_action' => $failure->next_action,
                        'due_date' => $failure->due_date?->toDateString(),
                    ])->all(),
                    'maintenance_events' => $shift->maintenanceEvents->map(fn ($event): array => [
                        'equipment_name' => $event->equipment_name,
                        'action' => $event->action,
                        'parts_used' => $event->parts_used,
                        'notes' => $event->notes,
                    ])->all(),
                    'handover_items' => $shift->handoverItems->map(fn ($item): array => [
                        'equipment_name' => $item->equipment_name,
                        'title' => $item->title,
                        'details' => $item->details,
                        'status' => $item->status,
                        'priority' => $item->priority,
                        'assigned_to' => $item->assigned_to,
                        'due_date' => $item->due_date?->toDateString(),
                    ])->all(),
                ];
            })->all(),
            'open_handover_items' => $openHandover->map(fn (HandoverItem $item): array => [
                'shift_date' => $item->shift?->shift_date?->toDateString(),
                'equipment_name' => $item->equipment_name,
                'title' => $item->title,
                'details' => $item->details,
                'status' => $item->status,
                'priority' => $item->priority,
                'assigned_to' => $item->assigned_to,
                'due_date' => $item->due_date?->toDateString(),
            ])->all(),
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
                                    'text' => $this->instructions($scenario, $options),
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

    private function instructions(?string $scenario, array $options): string
    {
        $base = <<<'TEXT'
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

        $scenarioPrompt = match ($scenario) {
            'weekly_summary' => "Сценарий: недельная сводка. Сначала коротко подведи итоги по выпуску, CO2, температурам, поломкам и незакрытым handover-пунктам.",
            'repeated_failures' => "Сценарий: повторяющиеся поломки. Вынеси в начало оборудования и проблемы, которые реально повторялись, с конкретными датами.",
            'co2_watch' => "Сценарий: контроль CO2. Ищи перерасход, аномалии и даты отклонений, но делай выводы только если данные действительно это подтверждают.",
            'handover_digest' => "Сценарий: handover digest. Сначала перечисли незакрытые пункты handover по приоритету и срокам, затем дай краткую рекомендацию по следующей смене.",
            'equipment_focus' => 'Сценарий: фокус на оборудовании. Отвечай только в контексте выбранного оборудования и упоминай связанные поломки, обслуживание и handover.',
            'shift_compare' => "Сценарий: сравнение смен. Сравни целевую смену с остальными загруженными сменами по ключевым цифрам и отклонениям, обязательно называя даты.",
            default => null,
        };

        $contextHint = [];

        if (is_string($options['equipment_name'] ?? null) && trim($options['equipment_name']) !== '') {
            $contextHint[] = 'Фокус по оборудованию: '.$options['equipment_name'];
        }

        if (isset($options['shift_id']) && is_numeric((string) $options['shift_id'])) {
            $contextHint[] = 'Целевая смена ID: '.$options['shift_id'];
        }

        return trim(implode("\n", array_filter([
            $base,
            $scenarioPrompt,
            $contextHint !== [] ? implode("\n", $contextHint) : null,
        ])));
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

    private function normalizeScenario(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $normalized = trim($value);

        return $normalized === '' ? null : $normalized;
    }

    private function normalized(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $normalized = mb_strtolower(trim($value));

        return $normalized === '' ? null : $normalized;
    }

    private function normalizedDate(mixed $value): ?string
    {
        if (! is_string($value) || trim($value) === '') {
            return null;
        }

        try {
            return Carbon::parse($value)->toDateString();
        } catch (\Throwable) {
            return null;
        }
    }
}
