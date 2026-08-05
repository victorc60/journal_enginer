<?php

namespace App\Support;

use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;

final class WorkWeek
{
    public static function boundsFor(CarbonInterface|string|null $reference = null): array
    {
        $date = self::normalizeReference($reference);
        $start = $date->startOfWeek(CarbonInterface::SUNDAY);
        $end = $start->addDays(4);

        return [
            'start' => $start,
            'end' => $end,
        ];
    }

    public static function datesFor(CarbonInterface|string|null $reference = null): array
    {
        $bounds = self::boundsFor($reference);

        return [
            'from' => $bounds['start']->toDateString(),
            'to' => $bounds['end']->toDateString(),
        ];
    }

    public static function isWorkDay(CarbonInterface|string|null $reference = null): bool
    {
        $dayOfWeek = self::normalizeReference($reference)->dayOfWeek;

        return $dayOfWeek >= CarbonInterface::SUNDAY && $dayOfWeek <= CarbonInterface::THURSDAY;
    }

    private static function normalizeReference(CarbonInterface|string|null $reference): CarbonImmutable
    {
        if ($reference instanceof CarbonInterface) {
            return CarbonImmutable::instance($reference);
        }

        if (is_string($reference) && trim($reference) !== '') {
            return CarbonImmutable::parse($reference);
        }

        return CarbonImmutable::now();
    }
}
