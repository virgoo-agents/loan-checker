# Loan Checker

Public comparison of fictional Polish payday loans (chwilówki) and installment loans (pożyczki ratalne), in PLN. No accounts, no applications, no admin UI. This change is the catalog, the pricing, and the ranking API. `src/app/page.tsx` is still the Next.js starter so the UI can be added without a rewrite.

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
| `period` | no | Positive integer. Blank is treated as omitted. |
| `periodUnit` | no | `days` or `months`. |

- Missing or blank amount → **400** `AMOUNT_REQUIRED` (`Podaj kwotę w złotych.`).
- Any other invalid amount → **400** `AMOUNT_INVALID`. No offer list is returned.
- Invalid period → **400** `PERIOD_INVALID`. The default period is not substituted.
- Invalid unit → **400** `PERIOD_UNIT_INVALID`.
- Amount only: active chwilówki that allow **30 days**, priced at 30 days, and active pożyczki ratalne that allow **12 months**, priced at 12 months. One list.
- `period` without `periodUnit` means **days**. A ratalna offer is not priced as if that number were months.
- `periodUnit=months` without `period` prices ratalne offers at 12 months.
- An offer is included only when it is active, `minAmountPln ≤ amount ≤ maxAmountPln`, and the period used is inside its own min/max.
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
  "query": { "amountPln": "1000.00", "period": 365, "periodUnit": "days" },
  "offers": [
    {
      "id": "para",
      "partnerName": "Para",
      "logoUrl": null,
      "productType": "payday",
      "productTypeLabel": "chwilówka",
      "requestedAmountPln": "1000.00",
      "period": 365,
      "periodUnit": "days",
      "periodLabel": "365 dni",
      "rrsoPercent": "10.00",
      "interestRatePercent": "10.00",
      "rateType": "fixed",
      "rateTypeLabel": "stała",
      "totalCostPln": "100.00",
      "totalRepayPln": "1100.00",
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
      "period": 365,
      "periodUnit": "days",
      "periodLabel": "365 dni",
      "rrsoPercent": "10.00",
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

`offersUpdatedAt` above is illustrative. The API returns the catalog's real `updated_at`.

For `?amount=1000` (period omitted), `query.period` and `query.periodUnit` are `null`. Each card still carries the period that was used.

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

- Payday total cost = interest + commission + fixed fee. One repayment at the end of the term. `RRSO = (totalRepay / amount) ^ (365 / days) − 1`.
- Installment rata is the equal monthly annuity on the principal. The one-time fee is paid with the first rata; `installmentPln` is the regular rata and does not include that fee. Total cost = interest + fee. Total repay = principal + total cost. RRSO is the rate that equates the amount received to the present value of those payments, with month `k` at time `k/12`.
- If rounding the rata would repay less than the principal, the rata increases by one grosz.
- A variable rate is priced from the stored rate. The label is what distinguishes it.
- This is a comparison model, not a statutory RRSO certificate.

## Seed

`prisma/seed.mjs` replaces the catalog with fictional lenders (Nurt, Fala Gotówki, Kropka Pożyczki, Błysk, Para, Para Plus, Mira Raty, Vega Raty, Góra Finansów, Grosik, and inactive Cichy Zakład).

| Request | Result |
| --- | --- |
| `?amount=1000` | Mixed default list. Cichy Zakład is inactive and stays out. |
| `?amount=1000&period=365` | Para then Para Plus: same 10.00 RRSO, lower cost first. Para Plus is the one with an affiliate URL. |
| `?amount=25000&periodUnit=months` | Vega Raty and Góra Finansów. |
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
