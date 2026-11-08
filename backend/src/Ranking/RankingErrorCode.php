<?php

declare(strict_types=1);

namespace App\Ranking;

enum RankingErrorCode: string
{
    case AmountRequired = 'AMOUNT_REQUIRED';
    case AmountInvalid = 'AMOUNT_INVALID';
    case PeriodInvalid = 'PERIOD_INVALID';
    case PeriodUnitInvalid = 'PERIOD_UNIT_INVALID';
    case OffersUnavailable = 'OFFERS_UNAVAILABLE';

    public function httpStatus(): int
    {
        return match ($this) {
            self::OffersUnavailable => 503,
            self::AmountRequired, self::AmountInvalid, self::PeriodInvalid, self::PeriodUnitInvalid => 400,
        };
    }

    public function field(): string
    {
        return match ($this) {
            self::AmountRequired, self::AmountInvalid => 'amount',
            self::PeriodInvalid => 'period',
            self::PeriodUnitInvalid => 'periodUnit',
            self::OffersUnavailable => 'offers',
        };
    }

    public function message(): string
    {
        return match ($this) {
            self::AmountRequired => 'Podaj kwotę w złotych.',
            self::AmountInvalid => 'Kwota musi być dodatnią liczbą całkowitą od 1 do 1000000 zł.',
            self::PeriodInvalid => 'Okres musi wynosić 30 albo 60 dni.',
            self::PeriodUnitInvalid => 'Jednostka okresu musi mieć wartość days.',
            self::OffersUnavailable => 'Nie udało się wczytać ofert. Spróbuj ponownie.',
        };
    }
}
