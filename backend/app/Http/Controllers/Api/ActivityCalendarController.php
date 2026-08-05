<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EveningPrep;
use App\Models\MorningRound;
use App\Models\Shift;
use App\Models\WaterControlLog;
use App\Support\WorkWeek;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class ActivityCalendarController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        [$monthStart, $monthEnd] = $this->resolveMonthBounds($request->query('month'));

        $morningRounds = MorningRound::query()
            ->whereDate('round_date', '>=', $monthStart->toDateString())
            ->whereDate('round_date', '<=', $monthEnd->toDateString())
            ->withCount([
                'entries as checked_entries_count' => fn ($query) => $query->where('is_checked', true),
            ])
            ->get()
            ->keyBy(fn (MorningRound $round): string => $round->round_date?->toDateString() ?? '');

        $eveningPreps = EveningPrep::query()
            ->whereDate('prep_date', '>=', $monthStart->toDateString())
            ->whereDate('prep_date', '<=', $monthEnd->toDateString())
            ->withCount([
                'entries as checked_entries_count' => fn ($query) => $query->where('is_checked', true),
            ])
            ->get()
            ->keyBy(fn (EveningPrep $prep): string => $prep->prep_date?->toDateString() ?? '');

        $waterLogs = WaterControlLog::query()
            ->whereDate('log_date', '>=', $monthStart->toDateString())
            ->whereDate('log_date', '<=', $monthEnd->toDateString())
            ->get()
            ->keyBy(fn (WaterControlLog $log): string => $log->log_date?->toDateString() ?? '');

        $shiftsByDate = Shift::query()
            ->whereDate('shift_date', '>=', $monthStart->toDateString())
            ->whereDate('shift_date', '<=', $monthEnd->toDateString())
            ->orderBy('shift_date')
            ->orderBy('id')
            ->get()
            ->groupBy(fn (Shift $shift): string => $shift->shift_date?->toDateString() ?? '');

        $today = CarbonImmutable::today();
        $days = collect();

        for ($cursor = $monthStart; $cursor->lte($monthEnd); $cursor = $cursor->addDay()) {
            $dateString = $cursor->toDateString();
            /** @var MorningRound|null $morningRound */
            $morningRound = $morningRounds->get($dateString);
            /** @var EveningPrep|null $eveningPrep */
            $eveningPrep = $eveningPreps->get($dateString);
            /** @var WaterControlLog|null $waterLog */
            $waterLog = $waterLogs->get($dateString);
            /** @var Collection<int, Shift> $shifts */
            $shifts = $shiftsByDate->get($dateString, collect());

            $items = collect($this->buildActivityItems(
                $cursor,
                $morningRound,
                $eveningPrep,
                $waterLog,
                $shifts
            ));

            $expectedItemsCount = $items->where('expected', true)->count();
            $completedExpectedCount = $items->filter(
                fn (array $item): bool => $item['expected'] && $item['recorded']
            )->count();
            $recordedItemsCount = $items->where('recorded', true)->count();

            $days->push([
                'date' => $dateString,
                'day_number' => $cursor->day,
                'is_today' => $cursor->isSameDay($today),
                'is_work_day' => WorkWeek::isWorkDay($cursor),
                'recorded_items_count' => $recordedItemsCount,
                'expected_items_count' => $expectedItemsCount,
                'completed_expected_count' => $completedExpectedCount,
                'is_complete' => $expectedItemsCount > 0 && $completedExpectedCount === $expectedItemsCount,
                'recorded_keys' => $items
                    ->where('recorded', true)
                    ->pluck('key')
                    ->values()
                    ->all(),
                'items' => $items->values()->all(),
            ]);
        }

        return response()->json([
            'month' => $monthStart->format('Y-m'),
            'range' => [
                'from' => $monthStart->toDateString(),
                'to' => $monthEnd->toDateString(),
            ],
            'today' => $today->toDateString(),
            'summary' => [
                'work_days_count' => $days->where('is_work_day', true)->count(),
                'active_days_count' => $days->filter(fn (array $day): bool => $day['recorded_items_count'] > 0)->count(),
                'complete_days_count' => $days->where('is_complete', true)->count(),
                'morning_round_days_count' => $days->filter(
                    fn (array $day): bool => in_array('morning_round', $day['recorded_keys'], true)
                )->count(),
                'evening_prep_days_count' => $days->filter(
                    fn (array $day): bool => in_array('evening_prep', $day['recorded_keys'], true)
                )->count(),
                'water_log_days_count' => $days->filter(
                    fn (array $day): bool => in_array('water', $day['recorded_keys'], true)
                )->count(),
                'shift_days_count' => $days->filter(
                    fn (array $day): bool => in_array('shift', $day['recorded_keys'], true)
                )->count(),
                'co2_days_count' => $days->filter(
                    fn (array $day): bool => in_array('co2', $day['recorded_keys'], true)
                )->count(),
            ],
            'days' => $days->all(),
        ]);
    }

    private function buildActivityItems(
        CarbonImmutable $date,
        ?MorningRound $morningRound,
        ?EveningPrep $eveningPrep,
        ?WaterControlLog $waterLog,
        Collection $shifts
    ): array {
        $isWorkDay = WorkWeek::isWorkDay($date);
        $isNextDayWorkDay = WorkWeek::isWorkDay($date->addDay());
        $headsCount = $shifts->sum(fn (Shift $shift): int => (int) ($shift->heads_count ?? 0));
        $co2Shifts = $shifts->filter(function (Shift $shift): bool {
            return $shift->co2_start_kg !== null
                || $shift->co2_end_kg !== null
                || $shift->co2_used_kg !== null
                || $shift->co2_per_head_g !== null;
        });
        $co2UsedKg = $co2Shifts->sum(fn (Shift $shift): float => (float) ($shift->co2_used_kg ?? 0));

        return [
            [
                'key' => 'morning_round',
                'label' => 'Утренний обход',
                'recorded' => $morningRound !== null,
                'expected' => $isWorkDay,
                'value' => $morningRound !== null
                    ? sprintf('%d пунктов отмечено', (int) ($morningRound->checked_entries_count ?? 0))
                    : ($isWorkDay ? 'Нет сохранённого обхода' : 'По графику не требуется'),
                'href' => '/morning-rounds',
            ],
            [
                'key' => 'evening_prep',
                'label' => 'Вечерняя подготовка',
                'recorded' => $eveningPrep !== null,
                'expected' => $isNextDayWorkDay,
                'value' => $eveningPrep !== null
                    ? sprintf('%d пунктов закрыто', (int) ($eveningPrep->checked_entries_count ?? 0))
                    : ($isNextDayWorkDay ? 'Нет вечерней подготовки' : 'По графику не требуется'),
                'href' => '/evening-prep',
            ],
            [
                'key' => 'shift',
                'label' => 'Запись смены',
                'recorded' => $shifts->isNotEmpty(),
                'expected' => $isWorkDay,
                'value' => $shifts->isNotEmpty()
                    ? ($headsCount > 0
                        ? sprintf('%d голов за день', $headsCount)
                        : sprintf('%d запись смены', $shifts->count()))
                    : ($isWorkDay ? 'Нет записи смены' : 'По графику не требуется'),
                'href' => '/shifts',
            ],
            [
                'key' => 'water',
                'label' => 'Вода и химия',
                'recorded' => $waterLog !== null,
                'expected' => $isWorkDay,
                'value' => $waterLog !== null
                    ? 'Показания воды сохранены'
                    : ($isWorkDay ? 'Нет записи по воде' : 'По графику не требуется'),
                'href' => '/water-co2',
            ],
            [
                'key' => 'co2',
                'label' => 'CO2',
                'recorded' => $co2Shifts->isNotEmpty(),
                'expected' => $isWorkDay,
                'value' => $co2Shifts->isNotEmpty()
                    ? ($co2UsedKg > 0
                        ? sprintf('%.2f кг расхода', round($co2UsedKg, 2))
                        : 'Показания CO2 сохранены')
                    : ($isWorkDay ? 'Нет записи CO2' : 'По графику не требуется'),
                'href' => '/water-co2',
            ],
        ];
    }

    private function resolveMonthBounds(mixed $value): array
    {
        if (! is_string($value) || trim($value) === '') {
            $currentMonth = CarbonImmutable::today()->startOfMonth();

            return [$currentMonth, $currentMonth->endOfMonth()];
        }

        try {
            $month = CarbonImmutable::createFromFormat('Y-m', trim($value))->startOfMonth();

            return [$month, $month->endOfMonth()];
        } catch (\Throwable) {
            $currentMonth = CarbonImmutable::today()->startOfMonth();

            return [$currentMonth, $currentMonth->endOfMonth()];
        }
    }
}
