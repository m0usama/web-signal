# WEB//SIGNAL

A private pixel-art communicator for exactly two people. A fictional night city you both live on, real-time chat, pokes that fly between your avatars, signal drops hidden on rooftops, and photos that vanish after one look.

**Stack:** Next.js (App Router, TypeScript) · Supabase (Auth, Postgres, Realtime, private Storage) · Vercel.

---

## What's inside

| Feature | How it works |
| --- | --- |
| **Two accounts only** | No sign-up page. Public sign-ups are switched off in Supabase; you create both accounts yourself and pair them with `setup_pair`. A room can never hold a third person. |
| **City map** | An original, procedurally drawn island city (same for both of you). Drag, pinch or scroll to zoom. Avatars stand at virtual spots — **no GPS is ever used**. Tap **MOVE** to stand somewhere else. |
| **Presence** | Online/offline, last seen, "typing…", and which screen the other person is on. Avatars hop when you're both online. |
| **Comms** | Text, emoji, pixel stickers, photos and GIFs, reactions (double-tap = 💜), read receipts, unsend. |
| **24H signals** | Expire 24 hours after sending. The database stops returning them and refuses to sign their media. |
| **Ghost signals** | Photo/GIF only. The receiver's first open is recorded by the server, starts a 5–30s countdown, then the media can never be fetched again. Unopened ghosts expire after 24h. |
| **Signal drops** | Leave a note, sticker, photo or GIF on a rooftop. The other person sees a glowing marker and opens it in a comic-book reveal. |
| **Pokes** | Heart, finger heart, hug, zap, star, tingle, web shot — they fly across the map. Hearts sent within 10 seconds of each other trigger **Heart Sync**. |
| **Sound** | Original chiptune alerts made in code (Web Audio). Different sounds for messages, pokes, drops and ghosts. When sound is off the screen flashes instead. |
| **Secrets** | Tap the logo three times. Tap rooftops and water towers. Read the bottom-left corner of the river. |
| **Badges** | Awarded by the database (first signal, heart sync, night owl, finder…). |

### Avatars

```
public/avatars/a.png   ← SpiderZiya (purple) — the FIRST email in setup_pair
public/avatars/b.png   ← Spidey (red)        — the SECOND email in setup_pair
```

Round portraits, 256×256 PNG with transparent corners. Replace the files to change them; if a file is missing the app falls back to a built-in pixel placeholder.

---

## Setup (about 20 minutes)

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com) (free plan is fine; choose the London region).
2. **Authentication → Sign In / Providers → Email:** turn **off** "Allow new users to sign up".
3. **SQL Editor → New query:** paste the whole of `supabase/migrations/20261028000000_web_signal.sql` and click **Run**.
   This creates every table, security rule, the private `signal-media` bucket, realtime settings and the cleanup job.
4. **Database → Extensions:** make sure **pg_cron** is enabled (the migration tries to enable it). If you enable it after running the SQL, run this once:
   ```sql
   select cron.schedule('web-signal-cleanup', '*/10 * * * *', 'select public.cleanup_expired()');
   ```
5. **Project Settings → API keys:** copy the **Project URL**, the **anon / publishable** key and the **service_role / secret** key.

### 2. Create and pair the two accounts

1. **Authentication → Users → Add user → Create new user.** Enter the email and a strong password for each person, and tick **Auto Confirm User**. (Or choose **Send invitation** to email a one-time link.)
2. **SQL Editor**, run once. The first email gets the purple SpiderZiya avatar, the second gets the red Spidey avatar:
   ```sql
   select public.setup_pair('ziya@example.com', 'SPIDERZIYA', 'usama@example.com', 'SPIDEY');
   ```
3. Share each password privately. Each person can change their password and display name later in **PROFILE**.

### 3. Vercel

1. At [vercel.com](https://vercel.com), sign in with GitHub → **Add New → Project** → import this repository.
2. Add these **Environment Variables** (Production and Preview):

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / publishable key |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role / secret key (**server only, never public**) |
   | `CRON_SECRET` | any long random string |

3. **Deploy.** Every push to `main` redeploys automatically.
4. Back in Supabase: **Authentication → URL Configuration** → set **Site URL** to your Vercel URL (needed for invitation and password-reset links).

### 4. On the phones

Open the site in Safari → Share → **Add to Home Screen**. Log in, tap **ENABLE SIGNAL SOUND** once per visit (browsers require a tap before playing sound).

---

## Security notes

- **Row Level Security on every table.** Only the two room members can read anything; logged-out visitors get nothing. Users can't post as each other, change their avatar, edit messages, or set open/expiry times (column privileges + triggers).
- **Private media.** Files live in a private bucket under `<room>/<user>/`. Clients can upload to their own folder (8 MB, PNG/JPEG/WebP/GIF only) but can't read any file. The server issues signed URLs that last 2 minutes (or only until a ghost's countdown ends), and only after a database check passes.
- **Expiry is enforced by the database**, not the browser: expired rows are hidden by policies, opening them is refused, pg_cron deletes them every 10 minutes, and the daily `/api/cleanup` job deletes their files from Storage.
- **Rate limits** in the database: 30 messages/min, 20 pokes/min, 10 drops per 10 min.
- Uploaded photos are re-encoded in the browser, which strips EXIF data such as GPS location.
- The service-role key is only used on the server.

**Honest limits:** disappearing signals can't stop screenshots, screen recordings, or copies saved before they vanish. Messages are private and encrypted in transit and at rest by Supabase, but this is **not end-to-end encryption**.

---

## Development

```bash
cp .env.example .env.local   # fill in your Supabase values
npm install
npm run dev
```

| Command | What it does |
| --- | --- |
| `npm run check` | typecheck + lint + unit tests + production build |
| `npm test` | Vitest unit tests |
| `npm run test:e2e` | Playwright two-person tests (needs a local Supabase, see CI) |
| `psql … -f tests/db/security.test.sql` | ~50 database security checks (impersonation, outsiders, expiry, ghost one-time open, storage folders, rate limits) |

GitHub Actions (`.github/workflows/ci.yml`) runs all of the above on every push against a throwaway local Supabase, including two browsers logged in as the two people at once.

## Known limitations

- Alerts play while the app is open (including in a background tab on desktop). Push notifications to a locked phone are not built yet; they need a service worker and iOS 16.4+ home-screen install.
- Vercel's free plan runs the Storage cleanup once a day; expired files are unreachable immediately but take up to a day to be physically deleted.
- Supabase's free plan pauses projects after a week with no activity; opening the app regularly keeps it awake.
