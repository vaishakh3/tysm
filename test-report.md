# Test Report — Vanity Slugs (PR #4)

**Result: PASS** — full create → claim → live page → UPI tip flow verified end-to-end against a live Supabase project. Lint + build clean.

Tested locally (`npm run dev`) with `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` wired to the real Supabase project, after the `creators` table + RLS policies were applied.

| # | Test | Result |
|---|------|--------|
| 1 | Slug auto-suggests from name + live availability check | PASS |
| 2 | Claim persists to Supabase, shows live share card + QR | PASS |
| 3 | Path route `/<slug>` fetches creator from backend | PASS |
| 4 | Pay button builds correct `upi://pay` deep link | PASS |
| 5 | Taken-slug detection | PASS |
| 6 | Hyphen typing preserved in slug input | PASS |
| 7 | Friendly not-found page for unclaimed slug | PASS |

---

### 1–2. Claim flow — availability check then live page

Typing a name auto-fills the slug and the live check confirms `tysm.in/riya-sharma is available`.

![available](https://app.devin.ai/attachments/6403cc7a-ce34-4bcc-8575-93112c57a3ea/screenshot_7fee2dd2eb4e4fe09c0adcd481604438.png)

After claiming, the row is inserted into Supabase and the share card + QR appear.

![live](https://app.devin.ai/attachments/6bb309a7-879f-4560-92ed-231473d4c2f2/screenshot_3728d5a0eae94f2ea88f55e31f905029.png)

### 3. Path route fetches from backend

Visiting `/riya-sharma` (a real URL path, not a hash) loads the creator from Supabase — name, bio, presets all render.

![slug page](https://app.devin.ai/attachments/ee51e764-dbb1-4835-96ee-6451a16ba592/screenshot_2fd7964b9caf4853a6ba6ea76a9d8bba.png)

### 4. UPI deep link

Selecting ₹99 + a note produces `upi://pay?pa=riya%40okicici&pn=Riya+Sharma&am=99.00&cu=INR&tn=Your+game+is+amazing%21`.

![pay](https://app.devin.ai/attachments/ade7b48e-dba5-443f-abd3-700b97fbe96b/screenshot_0cf060899d384f23bbbb164277c54613.png)

### 5–6. Taken-slug detection + hyphen typing

Re-entering an already-claimed slug shows it as taken (and hyphens are preserved while typing).

![taken](https://app.devin.ai/attachments/531be009-4147-4fa7-a54e-6c7ed1178262/screenshot_zoom_2de8a3c0fa5248eca02583efb9278866.png)

### 7. Not-found page

An unclaimed slug shows a friendly empty state with a create CTA.

![not found](https://app.devin.ai/attachments/25a10b50-dbfd-4d0e-ae37-c854dc7fde81/screenshot_f6fb0467e22f45549077cbef06f1a429.png)

---

### Notes / follow-ups for production (Vercel)
- Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel env (Production **and** Preview), else the create page shows a "Backend not configured" banner and claims fail.
- The Vercel **preview** deployment is gated by Vercel deployment protection (login required) — open it while signed in to your Vercel account, or disable protection for previews.
