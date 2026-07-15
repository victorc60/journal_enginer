<?php

namespace App\Services;

use App\Models\Shift;
use Illuminate\Support\Collection;

class AiInsightsService
{
    public function generate(): array
    {
        $shifts = Shift::query()
            ->with([
                'failures',
                'maintenanceEvents',
            ])
            ->orderBy('shift_date')
            ->orderBy('id')
            ->get();

        if ($shifts->isEmpty()) {
            return [
                'preliminary' => true,
                'overview' => 'Недостаточно данных для выводов: сохраненных смен пока нет.',
                'insights' => [],
            ];
        }

        $insights = array_values(array_filter([
            $this->co2TrendInsight($shifts),
            $this->abnormalCo2PerHeadInsight($shifts),
            $this->repeatedFailuresInsight($shifts),
            $this->mostDowntimeInsight($shifts),
            $this->meatTemperatureInsight($shifts),
            $this->missingDataInsight($shifts),
        ]));

        return [
            'preliminary' => $shifts->count() < 10,
            'overview' => $shifts->count() < 10
                ? 'Выводы предварительные: в журнале меньше 10 смен.'
                : null,
            'insights' => $insights,
        ];
    }

    private function co2TrendInsight(Collection $shifts): ?array
    {
        $points = $shifts
            ->filter(fn (Shift $shift): bool => $shift->co2_used_kg !== null)
            ->values();

        if ($points->count() < 6) {
            return null;
        }

        $windowSize = min(5, intdiv($points->count(), 2));

        if ($windowSize < 2) {
            return null;
        }

        $firstWindow = $points->take($windowSize)->values();
        $lastWindow = $points->slice(-$windowSize)->values();

        $firstAverage = round($firstWindow->avg(fn (Shift $shift) => (float) $shift->co2_used_kg), 2);
        $lastAverage = round($lastWindow->avg(fn (Shift $shift) => (float) $shift->co2_used_kg), 2);

        if ($firstAverage <= 0) {
            return null;
        }

        $changePercent = round((($lastAverage - $firstAverage) / $firstAverage) * 100, 1);

        if (abs($changePercent) < 7.0) {
            return null;
        }

        $direction = $changePercent > 0 ? 'растет' : 'снижается';

        return [
            'title' => $changePercent > 0 ? 'Расход CO2 растет' : 'Расход CO2 снижается',
            'explanation' => sprintf(
                'Средний расход CO2 %s: с %.2f кг на сменах %s-%s до %.2f кг на сменах %s-%s (%+.1f%%).',
                $direction,
                $firstAverage,
                $this->dateString($firstWindow->first()),
                $this->dateString($firstWindow->last()),
                $lastAverage,
                $this->dateString($lastWindow->first()),
                $this->dateString($lastWindow->last()),
                $changePercent,
            ),
            'related_dates' => $this->uniqueDates([
                $this->dateString($firstWindow->first()),
                $this->dateString($firstWindow->last()),
                $this->dateString($lastWindow->first()),
                $this->dateString($lastWindow->last()),
            ]),
            'suggested_action' => 'Сверьте расход CO2 по последним сменам с количеством голов и настройками линии, чтобы понять причину тренда.',
        ];
    }

    private function abnormalCo2PerHeadInsight(Collection $shifts): ?array
    {
        $points = $shifts
            ->filter(fn (Shift $shift): bool => $shift->co2_per_head_g !== null)
            ->values();

        if ($points->count() < 5) {
            return null;
        }

        $values = $points->map(fn (Shift $shift): float => (float) $shift->co2_per_head_g);
        $mean = $values->avg();
        $variance = $values->map(fn (float $value): float => ($value - $mean) ** 2)->avg();
        $stdDev = sqrt((float) $variance);
        $threshold = max($stdDev * 1.5, 3.0);

        $abnormal = $points
            ->filter(fn (Shift $shift): bool => abs((float) $shift->co2_per_head_g - $mean) >= $threshold)
            ->sortByDesc(fn (Shift $shift): float => abs((float) $shift->co2_per_head_g - $mean))
            ->take(3)
            ->values();

        if ($abnormal->isEmpty()) {
            return null;
        }

        $details = $abnormal
            ->map(fn (Shift $shift): string => sprintf(
                '%s: %.2f г/гол',
                $this->dateString($shift),
                (float) $shift->co2_per_head_g,
            ))
            ->implode('; ');

        return [
            'title' => 'Есть аномальные дни по CO2 на голову',
            'explanation' => sprintf(
                'Средний показатель по доступным сменам %.2f г/гол. Выделяются даты: %s.',
                round((float) $mean, 2),
                $details,
            ),
            'related_dates' => $abnormal->map(fn (Shift $shift): string => $this->dateString($shift))->all(),
            'suggested_action' => 'Проверьте учет голов, измерение CO2 и текст отчета по этим датам, чтобы подтвердить причину отклонения.',
        ];
    }

    private function repeatedFailuresInsight(Collection $shifts): ?array
    {
        $groups = collect();

        foreach ($shifts as $shift) {
            foreach ($shift->failures as $failure) {
                $problem = $this->normalizeText($failure->problem);

                if ($problem === null) {
                    continue;
                }

                $equipment = $this->normalizeText($failure->equipment_name) ?? 'unspecified-equipment';
                $key = $equipment.'|'.$problem;

                if (! $groups->has($key)) {
                    $groups->put($key, [
                        'equipment_name' => $failure->equipment_name ?: 'Не указано',
                        'problem' => $failure->problem,
                        'count' => 0,
                        'dates' => [],
                    ]);
                }

                $item = $groups->get($key);
                $item['count']++;
                $item['dates'][] = $this->dateString($shift);
                $groups->put($key, $item);
            }
        }

        $repeated = $groups
            ->filter(fn (array $item): bool => $item['count'] >= 2)
            ->sortByDesc('count')
            ->take(3)
            ->values();

        if ($repeated->isEmpty()) {
            return null;
        }

        $details = $repeated
            ->map(function (array $item): string {
                return sprintf(
                    '%s: "%s" повторялось %d раз (%s)',
                    $item['equipment_name'],
                    $item['problem'],
                    $item['count'],
                    implode(', ', $this->uniqueDates($item['dates'])),
                );
            })
            ->implode('; ');

        return [
            'title' => 'Есть повторяющиеся поломки',
            'explanation' => $details.'.',
            'related_dates' => $this->uniqueDates($repeated->flatMap(fn (array $item): array => $item['dates'])->all()),
            'suggested_action' => 'Соберите повторяющиеся случаи в отдельный список и проверьте, нужны ли плановые работы или смена настроек.',
        ];
    }

    private function mostDowntimeInsight(Collection $shifts): ?array
    {
        $downtimeByEquipment = collect();

        foreach ($shifts as $shift) {
            foreach ($shift->failures as $failure) {
                if ($failure->downtime_minutes === null || $failure->downtime_minutes <= 0) {
                    continue;
                }

                $equipmentName = $failure->equipment_name ?: 'Не указано';

                if (! $downtimeByEquipment->has($equipmentName)) {
                    $downtimeByEquipment->put($equipmentName, [
                        'equipment_name' => $equipmentName,
                        'total_downtime_minutes' => 0,
                        'dates' => [],
                    ]);
                }

                $item = $downtimeByEquipment->get($equipmentName);
                $item['total_downtime_minutes'] += $failure->downtime_minutes;
                $item['dates'][] = $this->dateString($shift);
                $downtimeByEquipment->put($equipmentName, $item);
            }
        }

        $top = $downtimeByEquipment
            ->sortByDesc('total_downtime_minutes')
            ->first();

        if (! is_array($top) || $top['total_downtime_minutes'] <= 0) {
            return null;
        }

        return [
            'title' => 'Оборудование с наибольшим простоем',
            'explanation' => sprintf(
                '%s дало суммарно %d минут простоя. Зафиксированные даты: %s.',
                $top['equipment_name'],
                $top['total_downtime_minutes'],
                implode(', ', $this->uniqueDates($top['dates'])),
            ),
            'related_dates' => $this->uniqueDates($top['dates']),
            'suggested_action' => 'Проверьте это оборудование в первую очередь и оцените, нужна ли отдельная профилактика или запасные части.',
        ];
    }

    private function meatTemperatureInsight(Collection $shifts): ?array
    {
        $target = config('insights.meat_temperature_target_c');

        if (! is_numeric($target)) {
            return null;
        }

        $targetValue = (float) $target;

        $aboveTarget = $shifts
            ->filter(fn (Shift $shift): bool => $shift->meat_temp_c !== null && (float) $shift->meat_temp_c > $targetValue)
            ->values();

        if ($aboveTarget->isEmpty()) {
            return null;
        }

        $topDates = $aboveTarget
            ->sortByDesc(fn (Shift $shift): float => (float) $shift->meat_temp_c)
            ->take(5)
            ->values();

        $details = $topDates
            ->map(fn (Shift $shift): string => sprintf(
                '%s: %.2f °C',
                $this->dateString($shift),
                (float) $shift->meat_temp_c,
            ))
            ->implode('; ');

        return [
            'title' => 'Температура мяса выше цели',
            'explanation' => sprintf(
                'Целевой порог %.2f °C превышен на %d сменах. Наиболее заметные даты: %s.',
                $targetValue,
                $aboveTarget->count(),
                $details,
            ),
            'related_dates' => $this->uniqueDates($aboveTarget->map(fn (Shift $shift): string => $this->dateString($shift))->all()),
            'suggested_action' => 'Сверьте загрузку линии, настройки холодильника и время охлаждения на указанных сменах.',
        ];
    }

    private function missingDataInsight(Collection $shifts): ?array
    {
        $requiredFields = [
            'heads_count' => 'heads_count',
            'co2_used_kg' => 'co2_used_kg',
            'co2_per_head_g' => 'co2_per_head_g',
            'chiller_temp_c' => 'chiller_temp_c',
            'meat_temp_c' => 'meat_temp_c',
        ];

        $missingDates = [];
        $missingFieldCounts = array_fill_keys(array_values($requiredFields), 0);

        foreach ($shifts as $shift) {
            $missingForShift = [];

            foreach ($requiredFields as $fieldKey => $fieldLabel) {
                if ($shift->{$fieldKey} === null) {
                    $missingFieldCounts[$fieldLabel]++;
                    $missingForShift[] = $fieldLabel;
                }
            }

            if ($missingForShift !== []) {
                $missingDates[] = $this->dateString($shift);
            }
        }

        if ($missingDates === []) {
            return null;
        }

        arsort($missingFieldCounts);
        $topFields = collect($missingFieldCounts)
            ->filter(fn (int $count): bool => $count > 0)
            ->take(3)
            ->map(fn (int $count, string $field): string => "{$field} ({$count})")
            ->values()
            ->implode(', ');

        return [
            'title' => 'Есть пропуски в данных смен',
            'explanation' => sprintf(
                'Пропуски найдены на датах: %s. Чаще всего отсутствуют поля: %s.',
                implode(', ', $this->uniqueDates($missingDates)),
                $topFields,
            ),
            'related_dates' => $this->uniqueDates($missingDates),
            'suggested_action' => 'После закрытия смены проверяйте обязательные поля перед сохранением, чтобы аналитика не искажалась.',
        ];
    }

    private function dateString(Shift $shift): string
    {
        return $shift->shift_date?->toDateString() ?? 'unknown-date';
    }

    private function normalizeText(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $normalized = mb_strtolower(trim($value));

        return $normalized === '' ? null : $normalized;
    }

    private function uniqueDates(array $dates): array
    {
        return array_values(array_unique(array_filter($dates)));
    }
}
