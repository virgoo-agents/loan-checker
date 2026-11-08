<?php

declare(strict_types=1);

namespace App\Tests;

use App\Offer\OfferReader;
use App\Ranking\ProductType;
use App\Tests\Support\OfferFactory;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class RankingHttpTest extends WebTestCase
{
    public function testGetRankingDefaultPeriod(): void
    {
        $client = $this->clientWith([OfferFactory::offer(['id' => 'pay', 'interestRateBps' => 1_000])]);
        $client->request('GET', '/api/ranking?amount=1000');
        self::assertResponseStatusCodeSame(200);
        $body = $this->json($client);
        self::assertTrue($body['ok']);
        self::assertSame(['amountPln' => '1000.00', 'period' => 30, 'periodUnit' => 'days'], $body['query']);
        self::assertSame('pay', $body['offers'][0]['id']);
        self::assertSame('10.47', $body['offers'][0]['rrsoPercent']);
        self::assertSame('8.22', $body['offers'][0]['totalCostPln']);
        self::assertNull($body['offers'][0]['installmentPln']);
    }

    public function testExplicitPeriodsAndRejections(): void
    {
        $client = $this->clientWith([
            OfferFactory::offer(['id' => 'pay', 'minPeriod' => 30, 'maxPeriod' => 60]),
            OfferFactory::offer([
                'id' => 'inst',
                'productType' => ProductType::Installment,
                'minPeriod' => 1,
                'maxPeriod' => 1,
            ]),
        ]);

        $client->request('GET', '/api/ranking?amount=1000&period=30');
        $thirty = $this->json($client);
        self::assertSame(30, $thirty['query']['period']);
        self::assertEqualsCanonicalizing(['inst', 'pay'], $this->ids($thirty));

        $client->request('GET', '/api/ranking?amount=1000&period=60&periodUnit=days');
        $sixty = $this->json($client);
        self::assertSame(60, $sixty['query']['period']);
        self::assertSame(['pay'], $this->ids($sixty));

        $client->request('GET', '/api/ranking?amount=1000&period=12&periodUnit=months');
        self::assertResponseStatusCodeSame(400);
        $months = $this->json($client);
        self::assertSame('PERIOD_UNIT_INVALID', $months['error']['code']);
        self::assertArrayNotHasKey('offers', $months);

        $client->request('GET', '/api/ranking?amount=1000&period=12');
        self::assertResponseStatusCodeSame(400);
        self::assertSame('PERIOD_INVALID', $this->json($client)['error']['code']);

        $client->request('GET', '/api/ranking');
        self::assertResponseStatusCodeSame(400);
        $missing = $this->json($client);
        self::assertSame('AMOUNT_REQUIRED', $missing['error']['code']);
        self::assertArrayNotHasKey('offers', $missing);

        $client->request('GET', '/api/ranking?amount=0');
        self::assertResponseStatusCodeSame(400);
        self::assertSame('AMOUNT_INVALID', $this->json($client)['error']['code']);
    }

    public function testEmptyListIsOk(): void
    {
        $client = $this->clientWith([OfferFactory::offer(['minAmountPln' => 500])]);
        $client->request('GET', '/api/ranking?amount=50');
        self::assertResponseStatusCodeSame(200);
        $body = $this->json($client);
        self::assertSame([], $body['offers']);
        self::assertSame('2026-11-05T12:00:00.000Z', $body['offersUpdatedAt']);
    }

    public function testDatabaseFailureIs503(): void
    {
        $client = $this->clientWith([], new \RuntimeException('connection refused'));
        $client->request('GET', '/api/ranking?amount=1000');
        self::assertResponseStatusCodeSame(503);
        $body = $this->json($client);
        self::assertSame('OFFERS_UNAVAILABLE', $body['error']['code']);
        self::assertSame('offers', $body['error']['field']);
        self::assertSame('Nie udało się wczytać ofert. Spróbuj ponownie.', $body['error']['message']);
        self::assertArrayNotHasKey('offers', $body);
    }

    public function testCorsAllowsTheVueOriginsAndRejectsOthers(): void
    {
        $client = $this->clientWith([]);
        $client->request('GET', '/api/ranking?amount=1', server: ['HTTP_ORIGIN' => 'http://localhost:5173']);
        self::assertResponseHeaderSame('Access-Control-Allow-Origin', 'http://localhost:5173');
        self::assertResponseHeaderSame('Access-Control-Allow-Methods', 'GET, OPTIONS');

        $client->request('OPTIONS', '/api/ranking', server: [
            'HTTP_ORIGIN' => 'https://loan-checker-virgoo.vercel.app',
            'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'GET',
        ]);
        self::assertResponseStatusCodeSame(204);
        self::assertResponseHeaderSame('Access-Control-Allow-Origin', 'https://loan-checker-virgoo.vercel.app');
        self::assertSame('Origin', $client->getResponse()->headers->get('Vary'));

        $client->request('GET', '/api/ranking?amount=1', server: ['HTTP_ORIGIN' => 'https://evil.example']);
        self::assertResponseStatusCodeSame(200);
        self::assertNull($client->getResponse()->headers->get('Access-Control-Allow-Origin'));
    }

    /**
     * @param list<\App\Ranking\OfferInput> $offers
     */
    private function clientWith(array $offers, ?\Throwable $error = null): KernelBrowser
    {
        $client = static::createClient();
        $client->disableReboot();
        $reader = $this->createStub(OfferReader::class);
        if ($error !== null) {
            $reader->method('all')->willThrowException($error);
        } else {
            $reader->method('all')->willReturn($offers);
        }
        static::getContainer()->set(OfferReader::class, $reader);

        return $client;
    }

    /**
     * @return array<string, mixed>
     */
    private function json(KernelBrowser $client): array
    {
        $decoded = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertIsArray($decoded);

        return $decoded;
    }

    /**
     * @param array<string, mixed> $body
     *
     * @return list<string>
     */
    private function ids(array $body): array
    {
        return array_map(static fn (array $row): string => $row['id'], $body['offers']);
    }
}
