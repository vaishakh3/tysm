# TYSM

Event feedback links for meetups, workshops, and community gatherings.

TYSM now pivots from tipping/testimonials into a simple feedback product: an admin creates an event, shares a link like `https://tysm.in/event/codex-meetup-june`, and attendee responses land in Supabase.

## Flow

1. Sign in as admin with Google.
2. Create an event with a title, slug, optional date, and prompt.
3. Share the generated event link or QR code.
4. Attendees submit rating + written feedback.
5. Admin reads responses from the TYSM dashboard.

## Supabase

Apply the migration in `supabase/migrations/0001_feedback_events.sql` to a TYSM Supabase project.

Required Vite env vars:

```bash
VITE_SUPABASE_URL=https://dyzjewjspfdaitcycmdk.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
```

`VITE_SUPABASE_ANON_KEY` still works as a fallback for older projects.

The migration enables RLS and grants Data API access explicitly:

- Public users can read active events and insert feedback responses.
- Authenticated owners can create/update/close their own events.
- Only event owners can read/delete responses.

## Development

```bash
npm install
npm run dev
npm run build
npm run lint
```

## Stack

- Vite + React + TypeScript
- Supabase Auth + Postgres
- Vercel edge routes for link previews
- `qrcode` for share QR codes
