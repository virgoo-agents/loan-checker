<?php

declare(strict_types=1);

namespace App\Tests;

use App\Doctrine\DatabaseUrl;
use PHPUnit\Framework\TestCase;

final class DatabaseUrlTest extends TestCase
{
    public function testStripsPrismaParamsAndKeepsSsl(): void
    {
        $adapted = DatabaseUrl::adapt(
            'postgresql://app:s3cret@aws-1-eu-central-1.pooler.supabase.com:5432/postgres?schema=public&sslmode=require&connection_limit=1&pgbouncer=true',
        );

        $params = $this->params($adapted);
        self::assertSame('16', $params['serverVersion']);
        self::assertSame('utf8', $params['charset']);
        self::assertSame('require', $params['sslmode']);
        self::assertArrayNotHasKey('schema', $params);
        self::assertArrayNotHasKey('connection_limit', $params);
        self::assertArrayNotHasKey('pgbouncer', $params);
        self::assertStringStartsWith(
            'postgresql://app:s3cret@aws-1-eu-central-1.pooler.supabase.com:5432/postgres?',
            $adapted,
        );
    }

    public function testSessionPoolerUrlGainsServerVersionWithoutReencodingUserinfo(): void
    {
        $adapted = DatabaseUrl::adapt(
            'postgresql://loan_app.example:p%40ss@aws-1-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require',
        );

        self::assertStringStartsWith('postgresql://loan_app.example:p%40ss@', $adapted);
        $params = $this->params($adapted);
        self::assertSame('16', $params['serverVersion']);
        self::assertSame('utf8', $params['charset']);
        self::assertSame('require', $params['sslmode']);
    }

    public function testLocalUrlDoesNotForceSsl(): void
    {
        $adapted = DatabaseUrl::adapt(
            'postgresql://loan_checker:loan_checker@127.0.0.1:5432/loan_checker?serverVersion=16&charset=utf8',
        );

        $params = $this->params($adapted);
        self::assertSame('16', $params['serverVersion']);
        self::assertSame('utf8', $params['charset']);
        self::assertArrayNotHasKey('sslmode', $params);
        self::assertStringStartsWith('postgresql://loan_checker:loan_checker@127.0.0.1:5432/loan_checker?', $adapted);
    }

    public function testSupabaseHostWithoutSslGainsRequire(): void
    {
        $params = $this->params(DatabaseUrl::adapt('postgresql://app:secret@db.example.supabase.co:5432/postgres'));

        self::assertSame('require', $params['sslmode']);
        self::assertSame('16', $params['serverVersion']);
    }

    /**
     * @return array<string, string>
     */
    private function params(string $url): array
    {
        $query = parse_url($url, PHP_URL_QUERY);
        self::assertIsString($query);
        parse_str($query, $params);
        /** @var array<string, string> $params */
        return $params;
    }
}
