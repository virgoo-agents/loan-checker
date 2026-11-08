<?php

declare(strict_types=1);

namespace App\Doctrine;

/**
 * Rewrites the shared Postgres URL for Doctrine without changing the value
 * stored for other tools. Prisma's `schema` query parameter is ignored.
 * `serverVersion` stops DBAL from opening a connection only to detect Postgres.
 */
final class DatabaseUrl
{
    private const DROP = [
        'schema',
        'pgbouncer',
        'connection_limit',
        'pool_timeout',
        'socket_timeout',
        'statement_cache_size',
        'sslaccept',
    ];

    public static function apply(): void
    {
        $current = $_SERVER['DATABASE_URL'] ?? $_ENV['DATABASE_URL'] ?? getenv('DATABASE_URL');
        if (!\is_string($current) || $current === '') {
            return;
        }

        $adapted = self::adapt($current);
        $_SERVER['DATABASE_URL'] = $adapted;
        $_ENV['DATABASE_URL'] = $adapted;
        putenv('DATABASE_URL='.$adapted);
    }

    public static function adapt(string $url): string
    {
        $question = strpos($url, '?');
        $base = $question === false ? $url : substr($url, 0, $question);
        $query = $question === false ? '' : substr($url, $question + 1);
        $params = [];
        if ($query !== '') {
            foreach (explode('&', $query) as $pair) {
                if ($pair === '') {
                    continue;
                }
                $equals = strpos($pair, '=');
                $key = rawurldecode($equals === false ? $pair : substr($pair, 0, $equals));
                $value = rawurldecode($equals === false ? '' : substr($pair, $equals + 1));
                $params[$key] = $value;
            }
        }

        foreach (self::DROP as $key) {
            unset($params[$key]);
        }

        $params['serverVersion'] = '16';
        if (($params['charset'] ?? '') === '') {
            $params['charset'] = 'utf8';
        }
        if (!isset($params['sslmode']) && self::supabaseHost($base)) {
            $params['sslmode'] = 'require';
        }

        $pairs = [];
        foreach ($params as $key => $value) {
            $pairs[] = rawurlencode((string) $key).'='.rawurlencode((string) $value);
        }

        return $pairs === [] ? $base : $base.'?'.implode('&', $pairs);
    }

    private static function supabaseHost(string $base): bool
    {
        if (!preg_match('~^[a-z][a-z0-9+.-]*://(?:[^/?#]*@)?(\[[^\]]+\]|[^:/?#]+)~i', $base, $match)) {
            return false;
        }

        $host = strtolower($match[1]);

        return $host === 'supabase.co'
            || $host === 'supabase.com'
            || str_ends_with($host, '.supabase.co')
            || str_ends_with($host, '.supabase.com');
    }
}
