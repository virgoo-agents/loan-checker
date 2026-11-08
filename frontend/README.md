# Loan Checker frontend

Vue 3 + Vite SPA. The first visit loads this client, then the app calls `GET /api/ranking`. There is no server rendering.

The form opens with **2 000 zł** and **30 dni**. Period choices are only 30 and 60 days, labeled „Okres spłaty”. Every request sends `amount`, `period`, and `periodUnit=days`. Cards stay in the order the API returns. „Przejdź do oferty” opens `affiliateUrl` in a new tab.

Leave `VITE_API_URL` unset to call same-origin `/api/ranking`. Set it only when the API lives on another origin. In `vite` dev, `/api` is proxied to `http://127.0.0.1:3000`.

`/polityka-prywatnosci` is a client route. The host should serve `index.html` for it.

```bash
npm install
npm test
npm run dev
```
