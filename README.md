# Loan Checker

Public comparison of fictional Polish payday loans (chwilówki) and installment loans (pożyczki ratalne), in PLN. No accounts, no applications, no admin UI.

Production is the two services in the root `vercel.json`:

- [`frontend/`](frontend/README.md) — Vue 3 + Vite SPA.
- [`backend/`](backend/README.md) — Symfony ranking API (`GET /api/ranking`).

The ranking contract, pricing rules, and API setup live in the backend README. `/api` is rewritten to the `backend` service. Every other path, including `/polityka-prywatnosci`, is rewritten to the `frontend` service.

Postgres 16 for local Symfony development is the Compose service in `docker-compose.yml`:

```bash
npm run db:up
```

User `loan_checker`, password `loan_checker`, database `loan_checker`, on `localhost:5432`. The `offers` catalog stays in that database. This cleanup does not migrate, seed, or drop it.

The Next.js pages and components under `src/` are the previous UI. They are not the production entrypoint and they do not read the catalog.
