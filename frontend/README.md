# Loan Checker frontend

Vue 3 + Vite SPA. The first visit loads this client, then the app calls `GET /api/ranking`. There is no server rendering.

The form opens with **2 000 zł** and **30 dni**. Period choices are only 30 and 60 days, labeled „Okres spłaty”. Every request sends `amount`, `period`, and `periodUnit=days`. Cards stay in the order the API returns. „Przejdź do oferty” opens `affiliateUrl` in a new tab.

Leave `VITE_API_URL` unset to call same-origin `/api/ranking`. Set it only for local development against Symfony, for example `VITE_API_URL=http://127.0.0.1:8000`. In `vite` dev, `/api` is proxied to `http://127.0.0.1:8000`.

`/polityka-prywatnosci` is a history-mode client route. Production routing is the root `vercel.json`: `/api` goes to the `backend` service, and every other path goes to the `frontend` service. That service rewrites unknown paths, including `/polityka-prywatnosci`, to `index.html`. The top-level catch-all does not point at `index.html`.

```bash
npm install
npm test
npm run dev
```
