# TYSM 💜

**Tip me, say thank you so much.** A mobile-first tipping page for India — turn gratitude into income with payments that land straight in your UPI account. No signup, no payment gateway, no middleman taking a cut.

> Live for the `TYSM.in` domain. Creators, freelancers, delivery folks, writers, and small businesses can share a single link and start getting tipped in two taps.

## How it works

1. **Create your page** — add your name + UPI ID (and optional bio, avatar, suggested amounts).
2. **Share your link** — you get a self-contained share URL + a scannable QR. Put it in your bio, story, or invoice.
3. **Get thanked** — a fan opens the page, picks an amount, writes a thank-you note, and taps **Pay**. Their UPI app (GPay / PhonePe / Paytm / any) opens prefilled, money goes directly to you.

## Why no backend (yet)

The MVP is intentionally **100% static**. A creator's profile is encoded directly into the share link (`/#/t/<token>`), so there's no database, no accounts, and nothing to host beyond static files. Payments use the official [UPI deep-link spec](https://www.npci.org.in/what-we-do/upi/product-overview) (`upi://pay?pa=...&am=...&tn=...`), which works with any UPI ID and requires **no payment-gateway integration or KYC**.

This lets us validate demand immediately. When we want to take a platform fee automatically, the next step is a payment gateway with split/route support (e.g. Razorpay Route / Cashfree) — see the roadmap.

## Roadmap

- **Phase 1 (this MVP):** UPI deep-link tipping pages, shareable links + QR.
- **Phase 2:** Accounts + persisted creator pages with vanity slugs (`tysm.in/yourname`), basic analytics.
- **Phase 3:** Platform fee via payment gateway (Razorpay Route / Cashfree) — requires a registered business + KYC.
- **Phase 4:** Premium creator pages, corporate "thank your team" bulk gifting.

## Tech stack

- [Vite](https://vitejs.dev/) + [React](https://react.dev/) + TypeScript
- Hash-based routing (no server config needed — deploys to any static host)
- [`qrcode`](https://www.npmjs.com/package/qrcode) for QR generation

## Development

```bash
npm install
npm run dev        # start dev server
npm run build      # typecheck + production build to dist/
npm run preview    # preview the production build
npm run lint       # eslint
```

## Project structure

```
src/
  App.tsx              # hash router
  lib.ts               # profile encode/decode, UPI link builder, validation
  types.ts             # TipProfile type
  useHashRoute.ts      # tiny hash-routing hook
  components/
    Landing.tsx        # marketing landing page
    CreatePage.tsx     # build-your-page form -> share link + QR
    TipPage.tsx        # public tipping page (decoded from link)
    Qr.tsx             # QR canvas
    Brand.tsx          # TYSM wordmark
```
