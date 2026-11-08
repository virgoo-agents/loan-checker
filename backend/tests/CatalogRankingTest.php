<?php

declare(strict_types=1);

namespace App\Tests;

use App\Catalog\Catalog;
use App\Ranking\Ranking;
use PHPUnit\Framework\TestCase;

final class CatalogRankingTest extends TestCase
{
    public function testSixtyDaysKeepsPaydayOffersThatAllowSixtyDays(): void
    {
        $result = Ranking::build(
            ['amount' => '1000', 'period' => '60'],
            Catalog::inputs(new \DateTimeImmutable('2026-11-05T12:00:00.000Z')),
        );
        self::assertSame(['nurt', 'para', 'kropka', 'para-plus'], self::ids($result));
        foreach ($result['offers'] as $offer) {
            self::assertSame('payday', $offer['productType']);
            self::assertSame(60, $offer['period']);
        }
        self::assertNull(self::byId($result, 'para')['affiliateUrl']);
        self::assertSame('https://example.com/partner/para-plus', self::byId($result, 'para-plus')['affiliateUrl']);
    }

    public function testDefaultThirtyDaysDropsInactiveAndLongInstallmentLoans(): void
    {
        $result = Ranking::build(
            ['amount' => '1000'],
            Catalog::inputs(new \DateTimeImmutable('2026-11-05T12:00:00.000Z')),
        );
        self::assertSame(['nurt', 'para', 'blysk', 'kropka', 'para-plus', 'fala'], self::ids($result));
        foreach ($result['offers'] as $offer) {
            self::assertSame(30, $offer['period']);
            self::assertSame('days', $offer['periodUnit']);
        }
    }

    public function testAmountsOutsideEveryRangeAreEmpty(): void
    {
        $rows = Catalog::inputs(new \DateTimeImmutable('2026-11-05T12:00:00.000Z'));
        foreach (['50', '70000', '25000'] as $amount) {
            $result = Ranking::build(['amount' => $amount], $rows);
            self::assertTrue($result['ok']);
            self::assertSame([], $result['offers']);
            self::assertSame(200, Ranking::httpStatus($result));
        }
    }

    /**
     * @param array<string, mixed> $result
     *
     * @return list<string>
     */
    private static function ids(array $result): array
    {
        return array_map(static fn (array $row): string => $row['id'], $result['offers']);
    }

    /**
     * @param array<string, mixed> $result
     *
     * @return array<string, mixed>
     */
    private static function byId(array $result, string $id): array
    {
        foreach ($result['offers'] as $row) {
            if ($row['id'] === $id) {
                return $row;
            }
        }
        self::fail('Missing offer '.$id);
    }
}
