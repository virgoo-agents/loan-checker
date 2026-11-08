# Loan Checker API

Symfony API for the same ranking the Next.js app serves at `GET /api/ranking`. No HTML ranking page and no `frontend/` app. The Next.js site at the repository root stays as it is.

PHP `>=8.5` and Symfony `8.1.*`. This tree was built and tested on PHP 8.5.12 and Symfony 8.1.11.

## Run

```bash
cd backend
composer install
php bin/console doctrine:migrations:migrate --no-interaction
php bin/console app:catalog:seed
php -S 127.0.0.1:8000 -t public public/index.php
```

`GET http://127.0.0.1:8000/api/ranking?amount=1000`

Postgres for local development is the repository root Compose service (`npm run db:up` from the root), not a second database. User `loan_checker`, password `loan_checker`, database `loan_checker`, PostgreSQL 16.

If that database already has the Prisma `offers` table and seed, skip the migrate and seed commands. The entity maps that table. The migration only creates the enums and table when they are missing, and it does not drop them (`doctrine:migrations:migrate prev` is refused). Running it on a database Prisma already migrated also creates Doctrine's `doctrine_migration_versions` table and leaves `offers` unchanged.

## Environment

`backend/.env` holds the Doctrine URL:

```
DATABASE_URL="postgresql://loan_checker:loan_checker@127.0.0.1:5432/loan_checker?serverVersion=16&charset=utf8"
```

Point `DATABASE_URL` at the same database the Next.js app uses. Keep Prisma's `?schema=public` on the root `.env` only. Doctrine does not use that parameter; `serverVersion=16` stops it from opening a connection just to detect the server.

`APP_ENV` is `dev` by default. Tests force `test`. Do not put production secrets in `backend/.env`. Overrides belong in `backend/.env.local` (git-ignored).

## Contract

`GET /api/ranking`

| Param | Required | Rule |
| --- | --- | --- |
| `amount` | yes | Integer PLN from 1 to 1000000. Trimmed. No decimals, signs, or leading zeros. |
| `period` | no | `30` or `60` only. Blank is omitted. |
| `periodUnit` | no | `days` only. Omit it to mean days. |

- Missing or blank amount → **400** `AMOUNT_REQUIRED` (`Podaj kwotę w złotych.`).
- Any other invalid amount → **400** `AMOUNT_INVALID`. The body has no `offers` array.
- Any period other than 30 or 60 → **400** `PERIOD_INVALID` (`Okres musi wynosić 30 albo 60 dni.`).
- `periodUnit` other than `days`, including `months` and `period=12&periodUnit=months` → **400** `PERIOD_UNIT_INVALID`.
- Omitted period, a blank period, or `periodUnit=days` with no number → 30 days.
- Success `query.period` is `30` or `60` and `query.periodUnit` is `"days"`.
- An offer is included only when it is active, the amount is inside its range, and it supports that term. Chwilówka ranges are days. Pożyczka ratalna ranges are months: 30 days is 1 month and 60 days is 2 months.
- Nothing matches → **200** and `"offers": []`.
- The database cannot be read → **503** `OFFERS_UNAVAILABLE`.

Order: lowest RRSO after half-up rounding to two decimal places, then lowest total cost, then `id`. `affiliateUrl` is not a sort input.

Money fields are dot-decimal PLN strings with two places (`1500.00`). `rrsoPercent` and `interestRatePercent` are percent strings with two places. `installmentPln` is set only for `installment`.

Labels: `chwilówka` / `pożyczka ratalna`, `stała` / `zmienna`. `productType` is `payday` or `installment`. `rateType` is `fixed` or `variable`.

Both products use the same day-count interest: amount × nominal annual rate × days / 365, half-up to the grosz, plus commission and the fixed fee. `RRSO = (totalRepay / amount) ^ (365 / days) − 1`. Pożyczka ratalna shows one rata at 30 days and two equal ratas at 60 days.

`offersUpdatedAt` is the latest `offers.updated_at`, including inactive rows, or `null` when the table is empty.

```json
{
  "ok": false,
  "error": {
    "code": "AMOUNT_REQUIRED",
    "field": "amount",
    "message": "Podaj kwotę w złotych."
  }
}
```

## Catalog

The reader maps the existing Prisma table `offers` (`partner_name`, `product_type` `"ProductType"`, `rate_type` `"RateType"`, amount and period integers, basis points, grosze, `affiliate_url`, `active`, `created_at`, `updated_at`). No column rename.

`src/Catalog/Catalog.php` is the same eleven lenders as `prisma/offers.mjs`. `php bin/console app:catalog:seed` deletes every row and inserts those lenders. Run it only when you mean to replace the catalog. A database that was already seeded by Prisma does not need it.

## CORS

Responses include `Access-Control-Allow-Origin` for:

- `https://loan-checker-virgoo.vercel.app`
- `http://localhost:5173`

Other origins are not reflected. `OPTIONS` from those two origins returns 204. Methods: `GET, OPTIONS`. Headers: `Accept, Content-Type`.

## Tests

```bash
composer test
composer lint
```

`composer test` is PHPUnit. It does not need Postgres: ranking cases call the ranker directly, and HTTP cases replace the offer reader. `composer lint` checks the container, YAML, and PHP syntax.

## Later hosting

Do not add a root `vercel.json`. That file would take over the current Next.js deployment. A later API host can be Docker/FrankenPHP in this `backend/` directory, separate from the Vercel site.
