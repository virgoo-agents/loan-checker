# Loan Checker

Public comparison of fictional Polish payday loans (chwilówki) and installment loans (pożyczki ratalne), in PLN. No accounts, no applications, no admin UI.

The page is the comparison UI. The first response is server-rendered from `loadRanking()`. Changing the amount or the period updates the ranking through `GET /api/ranking` without a full reload. The form label is „Okres spłaty”. It is a required choice of 30 or 60 days and defaults to 30. Every request sends that one `period` with `periodUnit=days` for the whole ranking. Cards stay in the order returned. „Przejdź do oferty” opens `affiliateUrl` in a new tab.

Affiliate links are stored for „Przejdź do oferty” and do not change rank.

## API

`GET /api/ranking`

A Server Component can skip HTTP:

```ts
import { loadRanking } from "@/lib/offers";

const ranking = await loadRanking(new URLSearchParams({ amount: "1000" }));
```

Response types are `RankingResult` in `@/lib/ranking`.

### Query

| Param | Required | Rule |
| --- | --- | --- |
| `amount` | yes | Integer PLN from 1 to 1000000. Trimmed. No decimals, signs, or leading zeros. |
| `period` | no | `30` or `60` only. Blank is omitted. |
| `periodUnit` | no | `days` only. Omit it to mean days. |

Send `period=30` or `period=60`. Omit `period` to get 30 days. Do not send months.

- Missing or blank amount → **400** `AMOUNT_REQUIRED` (`Podaj kwotę w złotych.`).
- Any other invalid amount → **400** `AMOUNT_INVALID`. No offer list is returned.
- Any period other than 30 or 60 → **400** `PERIOD_INVALID` (`Okres musi wynosić 30 albo 60 dni.`). The default is not substituted.
- `periodUnit` other than `days`, including `months` → **400** `PERIOD_UNIT_INVALID`. `period=12&periodUnit=months` is rejected.
- Omitted period, a blank period, or `periodUnit=days` without a number → **30 days** for the whole list.
- One period for every card. `query.period` is `30` or `60` and `query.periodUnit` is `"days"`.
- An offer is included only when it is active, the amount is inside its range, and it supports that term. Chwilówka ranges are days: 30 or 60 must sit between `minPeriod` and `maxPeriod`. Pożyczka ratalna ranges are months: 30 days counts as 1 month and 60 days as 2 months. Do not compare the raw number 30 with a month maximum. An offer outside that term is left out. There is no 12-month fallback.
- Nothing matches → **200** and `"offers": []`.
- The database cannot be read → **503** `OFFERS_UNAVAILABLE`.

### Order

1. Lowest RRSO, after half-up rounding to two decimal places (the same value as `rrsoPercent`).
2. Lowest total cost.
3. Offer `id`, so equal rows stay stable.

There is no placement or sponsorship column. `offersUpdatedAt` is the latest `offers.updated_at`, including inactive rows, or `null` when the table is empty. `criterion` is present on every success, including an empty list.

### Numbers

PLN fields are dot-decimal strings with two places (`1500.00`). Grouping and the złoty sign belong in the UI, for example `Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" })`.

`rrsoPercent` and `interestRatePercent` are percent strings with two places (`18.50` means 18.50%). `installmentPln` is the monthly rata for `installment` and `null` for `payday`.

| Field | Values |
| --- | --- |
| `productType` | `payday`, `installment` |
| `productTypeLabel` | `chwilówka`, `pożyczka ratalna` |
| `rateType` | `fixed`, `variable` |
| `rateTypeLabel` | `stała`, `zmienna` |

### Success

```json
{
  "ok": true,
  "criterion": {
    "id": "lowest_rrso_then_total_cost",
    "label": "Najniższe RRSO; przy równym RRSO najniższy koszt całkowity"
  },
  "offersUpdatedAt": "2026-11-06T12:00:00.000Z",
  "query": { "amountPln": "1000.00", "period": 30, "periodUnit": "days" },
  "offers": [
    {
      "id": "para",
      "partnerName": "Para",
      "logoUrl": null,
      "productType": "payday",
      "productTypeLabel": "chwilówka",
      "requestedAmountPln": "1000.00",
      "period": 30,
      "periodUnit": "days",
      "periodLabel": "30 dni",
      "rrsoPercent": "10.47",
      "interestRatePercent": "10.00",
      "rateType": "fixed",
      "rateTypeLabel": "stała",
      "totalCostPln": "8.22",
      "totalRepayPln": "1008.22",
      "installmentPln": null,
      "affiliateUrl": null
    },
    {
      "id": "para-plus",
      "partnerName": "Para Plus",
      "logoUrl": null,
      "productType": "payday",
      "productTypeLabel": "chwilówka",
      "requestedAmountPln": "1000.00",
      "period": 30,
      "periodUnit": "days",
      "periodLabel": "30 dni",
      "rrsoPercent": "218.90",
      "interestRatePercent": "0.00",
      "rateType": "fixed",
      "rateTypeLabel": "stała",
      "totalCostPln": "100.01",
      "totalRepayPln": "1100.01",
      "installmentPln": null,
      "affiliateUrl": "https://example.com/partner/para-plus"
    }
  ]
}
```

`offersUpdatedAt` above is illustrative. The API returns the catalog's real `updated_at`. Those two cards are Para and Para Plus at 30 days; the full `?amount=1000` list also contains the other chwilówki whose day range includes 30. Mira Raty is not in it: its term starts at 6 months, and 30 days is 1 month.

For an omitted period, `query.period` is `30` and `query.periodUnit` is `"days"`. Every card uses that same period. `installmentPln` is set only on pożyczka ratalna, and only when that offer's month range includes 1 (for 30 days) or 2 (for 60 days).

### Error

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

Error responses have no `offers` array. Codes: `AMOUNT_REQUIRED`, `AMOUNT_INVALID`, `PERIOD_INVALID`, `PERIOD_UNIT_INVALID`, `OFFERS_UNAVAILABLE`.

## Pricing

Stored per offer: amount range (integer PLN), period range, nominal annual rate in basis points (`1850` = 18.50%), `fixed` or `variable`, commission in basis points of the amount, fixed fee in grosze, affiliate URL, active flag.

- Both products use the same day-count interest: amount × nominal annual rate × days / 365, half-up to the grosz, plus commission and the fixed fee. `RRSO = (totalRepay / amount) ^ (365 / days) − 1`. The same rate and fees therefore produce the same total cost at 30 days and again at 60 days.
- Pożyczka ratalna shows an equal rata over 1 payment at 30 days (the full amount to repay) or 2 payments at 60 days. Chwilówka leaves `installmentPln` null.
- A variable rate is priced from the stored rate. The label is what distinguishes it.
- This is a comparison model, not a statutory RRSO certificate.

## Seed

`prisma/seed.mjs` replaces the catalog with fictional lenders (Nurt, Fala Gotówki, Kropka Pożyczki, Błysk, Para, Para Plus, Mira Raty, Vega Raty, Góra Finansów, Grosik, and inactive Cichy Zakład).

| Request | Result |
| --- | --- |
| `?amount=1000` | 30 days. Nurt, Para, Błysk, Kropka Pożyczki, Para Plus, Fala Gotówki. Cichy Zakład is inactive. Mira, Vega, and Góra stay out (shortest terms 6 or 12 months). |
| `?amount=1000&period=60` | 60 days. Nurt, Para, Kropka Pożyczki, Para Plus. Fala and Błysk stop at 30 days. Still no seeded ratalna. |
| `?amount=25000` | 200 and an empty list. The only offers in range are ratalne outside 1 month. |
| `?period=12` or `?periodUnit=months` | 400. |
| `?amount=50` or `?amount=70000` | 200 and an empty list. |
| `?amount=` | 400. |

## Local setup

```bash
cp .env.example .env
npm install
npm run db:up
npm run db:migrate
npm run db:seed
npm run dev
```

Postgres 16 is the Compose service `postgres` on `localhost:5432` (`loan_checker` / `loan_checker`, database `loan_checker`). `npm test` runs the ranking cases and does not need a database.
