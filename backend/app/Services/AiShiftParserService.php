<?php

namespace App\Services;

use App\Models\HandoverItem;
use App\Models\ShiftNote;
use Carbon\Carbon;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use JsonException;
use RuntimeException;

class AiShiftParserService
{
    public function parse(string $text): array
    {
        $apiKey = (string) config('services.openai.api_key');
        $baseUrl = (string) config('services.openai.base_url');
        $model = (string) config('services.openai.model', 'gpt-5.5');

        if ($apiKey === '') {
            throw new RuntimeException('OPENAI_API_KEY is not configured.');
        }

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
                        'format' => [
                            'type' => 'json_schema',
                            'name' => 'shift_parser_output',
                            'strict' => true,
                            'schema' => $this->schema(),
                        ],
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
                                    'text' => $text,
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

        $parsed = $this->decodeResponse($response->json());

        return $this->normalize($parsed);
    }

    private function decodeResponse(array $payload): array
    {
        $outputText = $payload['output_text'] ?? $this->extractOutputText($payload);

        if (! is_string($outputText) || trim($outputText) === '') {
            throw new RuntimeException('OpenAI did not return parser output.');
        }

        try {
            $decoded = json_decode($outputText, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException $exception) {
            throw new RuntimeException('OpenAI returned invalid parser JSON.', previous: $exception);
        }

        if (! is_array($decoded)) {
            throw new RuntimeException('OpenAI returned an unexpected parser payload.');
        }

        return $decoded;
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

    private function normalize(array $data): array
    {
        $normalized = [
            'shift_date' => $this->normalizeDate($data['shift_date'] ?? null) ?? now()->toDateString(),
            'heads_count' => $this->normalizeInteger($data['heads_count'] ?? null),
            'work_hours' => $this->normalizeDecimal($data['work_hours'] ?? null),
            'co2_start_kg' => $this->normalizeDecimal($data['co2_start_kg'] ?? null),
            'co2_end_kg' => $this->normalizeDecimal($data['co2_end_kg'] ?? null),
            'co2_used_kg' => $this->normalizeDecimal($data['co2_used_kg'] ?? null),
            'outside_temp_c' => $this->normalizeDecimal($data['outside_temp_c'] ?? null),
            'chiller_temp_c' => $this->normalizeDecimal($data['chiller_temp_c'] ?? null),
            'meat_temp_c' => $this->normalizeDecimal($data['meat_temp_c'] ?? null),
            'notes' => $this->normalizeString($data['notes'] ?? null),
            'failures' => $this->normalizeFailures($data['failures'] ?? []),
            'maintenance_events' => $this->normalizeMaintenanceEvents($data['maintenance_events'] ?? []),
            'handover_items' => $this->normalizeHandoverItems($data['handover_items'] ?? []),
            'categorized_notes' => $this->normalizeCategorizedNotes($data['categorized_notes'] ?? []),
        ];

        $normalized['co2_per_head_g'] = $this->calculateCo2PerHead(
            $normalized['heads_count'],
            $normalized['co2_used_kg'],
        );

        return $normalized;
    }

    private function normalizeFailures(mixed $failures): array
    {
        if (! is_array($failures)) {
            return [];
        }

        $normalized = [];

        foreach ($failures as $failure) {
            if (! is_array($failure)) {
                continue;
            }

            $item = [
                'equipment_name' => $this->normalizeString($failure['equipment_name'] ?? null),
                'problem' => $this->normalizeString($failure['problem'] ?? null),
                'cause' => $this->normalizeString($failure['cause'] ?? null),
                'solution' => $this->normalizeString($failure['solution'] ?? null),
                'downtime_minutes' => $this->normalizeInteger($failure['downtime_minutes'] ?? null),
                'severity' => $this->normalizeString($failure['severity'] ?? null),
            ];

            if ($item['problem'] === null) {
                continue;
            }

            $normalized[] = $item;
        }

        return $normalized;
    }

    private function normalizeMaintenanceEvents(mixed $events): array
    {
        if (! is_array($events)) {
            return [];
        }

        $normalized = [];

        foreach ($events as $event) {
            if (! is_array($event)) {
                continue;
            }

            $item = [
                'equipment_name' => $this->normalizeString($event['equipment_name'] ?? null),
                'action' => $this->normalizeString($event['action'] ?? null),
                'parts_used' => $this->normalizeString($event['parts_used'] ?? null),
                'notes' => $this->normalizeString($event['notes'] ?? null),
            ];

            if ($item['action'] === null) {
                continue;
            }

            $normalized[] = $item;
        }

        return $normalized;
    }

    private function normalizeHandoverItems(mixed $items): array
    {
        if (! is_array($items)) {
            return [];
        }

        $normalized = [];

        foreach ($items as $item) {
            if (! is_array($item)) {
                continue;
            }

            $title = $this->normalizeString($item['title'] ?? null);
            $details = $this->normalizeString($item['details'] ?? null);

            if ($title === null && $details !== null) {
                $title = $details;
            }

            if ($title === null) {
                continue;
            }

            $normalized[] = [
                'equipment_name' => $this->normalizeString($item['equipment_name'] ?? null),
                'title' => mb_substr($title, 0, 160),
                'details' => $details,
                'assigned_to' => $this->normalizeString($item['assigned_to'] ?? null),
                'due_date' => $this->normalizeDate($item['due_date'] ?? null),
                'priority' => $this->normalizePriority($item['priority'] ?? null),
            ];
        }

        return $normalized;
    }

    private function normalizeCategorizedNotes(mixed $notes): array
    {
        if (! is_array($notes)) {
            return [];
        }

        $normalized = [];

        foreach ($notes as $note) {
            if (! is_array($note)) {
                continue;
            }

            $category = $this->normalizeCategory($note['category'] ?? null);
            $content = $this->normalizeString($note['content'] ?? null);

            if ($category === null || $content === null) {
                continue;
            }

            $normalized[] = [
                'category' => $category,
                'content' => $content,
            ];
        }

        return $normalized;
    }

    private function calculateCo2PerHead(?int $headsCount, ?float $co2UsedKg): ?float
    {
        if ($headsCount === null || $headsCount <= 0 || $co2UsedKg === null) {
            return null;
        }

        return round(($co2UsedKg * 1000) / $headsCount, 2);
    }

    private function normalizeDate(mixed $value): ?string
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

    private function normalizeInteger(mixed $value): ?int
    {
        if (! is_int($value) && ! is_float($value) && ! is_string($value)) {
            return null;
        }

        if ($value === '' || $value === null || ! is_numeric((string) $value)) {
            return null;
        }

        return (int) round((float) $value);
    }

    private function normalizeDecimal(mixed $value): ?float
    {
        if (! is_int($value) && ! is_float($value) && ! is_string($value)) {
            return null;
        }

        if ($value === '' || $value === null || ! is_numeric((string) $value)) {
            return null;
        }

        return round((float) $value, 2);
    }

    private function normalizeString(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $normalized = trim($value);

        return $normalized === '' ? null : $normalized;
    }

    private function normalizeCategory(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $normalized = trim($value);

        return in_array($normalized, ShiftNote::CATEGORIES, true) ? $normalized : null;
    }

    private function normalizePriority(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $normalized = trim($value);

        return in_array($normalized, HandoverItem::PRIORITIES, true) ? $normalized : null;
    }

    private function instructions(): string
    {
        return <<<'TEXT'
You extract structured pig slaughterhouse shift data from free-form reports.

Return JSON only, matching the provided schema exactly.

Rules:
- Understand Russian, Romanian, and English.
- Never invent missing numbers.
- If a value is missing or uncertain, return null.
- Use empty arrays when no failures or maintenance events are present.
- Use YYYY-MM-DD only when a date is clearly stated in the text; otherwise return null.
- Capture temperatures and CO2 values only when clearly stated.
- Put extra qualitative context into notes only when useful and grounded in the text.
- Extract unresolved follow-up actions for the next shift into handover_items.
- Handover items should describe what remains to watch, fix, verify, or pass on.
- Also extract categorized notes as short factual statements grouped into these categories only:
  production, co2, temperatures, failures, maintenance, ideas, general_notes.
- Categorized notes may overlap with structured fields when that helps preserve the original report context.
- A failure is a problem, malfunction, interruption, alarm, unstable behavior, or similar issue.
- A maintenance event is an action performed to inspect, adjust, repair, clean, replace, or stabilize equipment.
- Do not duplicate the same fact across multiple fields unless it clearly belongs there.
TEXT;
    }

    private function schema(): array
    {
        return [
            'type' => 'object',
            'additionalProperties' => false,
            'properties' => [
                'shift_date' => $this->nullableStringSchema(),
                'heads_count' => $this->nullableIntegerSchema(),
                'work_hours' => $this->nullableNumberSchema(),
                'co2_start_kg' => $this->nullableNumberSchema(),
                'co2_end_kg' => $this->nullableNumberSchema(),
                'co2_used_kg' => $this->nullableNumberSchema(),
                'outside_temp_c' => $this->nullableNumberSchema(),
                'chiller_temp_c' => $this->nullableNumberSchema(),
                'meat_temp_c' => $this->nullableNumberSchema(),
                'notes' => $this->nullableStringSchema(),
                'handover_items' => [
                    'type' => 'array',
                    'items' => [
                        'type' => 'object',
                        'additionalProperties' => false,
                        'properties' => [
                            'equipment_name' => $this->nullableStringSchema(),
                            'title' => $this->nullableStringSchema(),
                            'details' => $this->nullableStringSchema(),
                            'assigned_to' => $this->nullableStringSchema(),
                            'due_date' => $this->nullableStringSchema(),
                            'priority' => [
                                'type' => ['string', 'null'],
                                'enum' => array_merge(HandoverItem::PRIORITIES, [null]),
                            ],
                        ],
                        'required' => [
                            'equipment_name',
                            'title',
                            'details',
                            'assigned_to',
                            'due_date',
                            'priority',
                        ],
                    ],
                ],
                'categorized_notes' => [
                    'type' => 'array',
                    'items' => [
                        'type' => 'object',
                        'additionalProperties' => false,
                        'properties' => [
                            'category' => [
                                'type' => 'string',
                                'enum' => ShiftNote::CATEGORIES,
                            ],
                            'content' => [
                                'type' => 'string',
                            ],
                        ],
                        'required' => [
                            'category',
                            'content',
                        ],
                    ],
                ],
                'failures' => [
                    'type' => 'array',
                    'items' => [
                        'type' => 'object',
                        'additionalProperties' => false,
                        'properties' => [
                            'equipment_name' => $this->nullableStringSchema(),
                            'problem' => $this->nullableStringSchema(),
                            'cause' => $this->nullableStringSchema(),
                            'solution' => $this->nullableStringSchema(),
                            'downtime_minutes' => $this->nullableIntegerSchema(),
                            'severity' => $this->nullableStringSchema(),
                        ],
                        'required' => [
                            'equipment_name',
                            'problem',
                            'cause',
                            'solution',
                            'downtime_minutes',
                            'severity',
                        ],
                    ],
                ],
                'maintenance_events' => [
                    'type' => 'array',
                    'items' => [
                        'type' => 'object',
                        'additionalProperties' => false,
                        'properties' => [
                            'equipment_name' => $this->nullableStringSchema(),
                            'action' => $this->nullableStringSchema(),
                            'parts_used' => $this->nullableStringSchema(),
                            'notes' => $this->nullableStringSchema(),
                        ],
                        'required' => [
                            'equipment_name',
                            'action',
                            'parts_used',
                            'notes',
                        ],
                    ],
                ],
            ],
            'required' => [
                'shift_date',
                'heads_count',
                'work_hours',
                'co2_start_kg',
                'co2_end_kg',
                'co2_used_kg',
                'outside_temp_c',
                'chiller_temp_c',
                'meat_temp_c',
                'notes',
                'handover_items',
                'categorized_notes',
                'failures',
                'maintenance_events',
            ],
        ];
    }

    private function nullableStringSchema(): array
    {
        return [
            'type' => ['string', 'null'],
        ];
    }

    private function nullableIntegerSchema(): array
    {
        return [
            'type' => ['integer', 'null'],
        ];
    }

    private function nullableNumberSchema(): array
    {
        return [
            'type' => ['number', 'null'],
        ];
    }
}
