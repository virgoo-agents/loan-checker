# syntax=docker/dockerfile:1

FROM dunglas/frankenphp:1.13.5-php8.5.12-bookworm AS base

RUN cp "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini" \
    && install-php-extensions intl zip pdo_pgsql

WORKDIR /app

FROM base AS dependencies

ENV APP_ENV=prod \
    APP_DEBUG=0

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
COPY composer.json composer.lock symfony.lock ./
RUN composer install \
    --no-dev \
    --no-interaction \
    --no-progress \
    --no-scripts \
    --optimize-autoloader \
    --prefer-dist

COPY . .
RUN composer dump-autoload --no-dev --classmap-authoritative \
    && php bin/console cache:clear

FROM base AS runtime

COPY --from=dependencies --chown=www-data:www-data /app /app
COPY --chown=www-data:www-data Caddyfile /etc/frankenphp/Caddyfile

RUN setcap CAP_NET_BIND_SERVICE=+eip /usr/local/bin/frankenphp \
    && chown -R www-data:www-data /config/caddy /data/caddy /app/var

ENV PORT=80 \
    APP_ENV=prod \
    APP_DEBUG=0

USER www-data

EXPOSE 80

LABEL org.opencontainers.image.source="https://github.com/virgoo-agents/loan-checker" \
      org.opencontainers.image.title="loan-checker-api"

CMD ["frankenphp", "run", "--config", "/etc/frankenphp/Caddyfile"]
