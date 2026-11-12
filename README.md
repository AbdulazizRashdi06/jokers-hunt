## Run the local preview (no accounts or cloud services needed)

```sh
npm ci
npm run local
```

Open http://localhost:3002. The preview includes five checkpoints and three
sample teams, and runs entirely on your computer. Organizer login:

- Email: `organizer@local.test`
- Password: `JokerLocal!2026`

Try registering a team, then use checkpoint backup codes `DEMO0001` through
`DEMO0005`. Answers and printable QR codes are available in the organizer editor.
Sample team rejoin codes are `JH-DEMO-0001-TEAM` (Wild Cards),
`JH-DEMO-0002-TEAM` (Royal Flush), and `JH-DEMO-0003-TEAM` (The Aces).

Changes are saved in `.local-data/preview.json`, which Git ignores. Stop the
server and remove `.local-data` to reset the sample data. This preview binds to
127.0.0.1 and its demo login only works in the explicitly enabled development
mode; the production login stays unchanged. No `.env.local` file is needed.

---

# 🃏 THE JOKER'S HUNT
**GUvoices × German Festival · Debate Club · GUtech, Oman · 8 December 2026**

> Every card holds a clue.

This is an actual **Next.js + React + Tailwind CSS + Supabase** treasure-hunt website, prepared for deployment on **Vercel**. It includes the uploaded official festival poster, Debate Club logo, and German Club logo. Campus locations intentionally remain placeholders.

## What is included?

| Player experience | Organizer controls |
|---|---|
| Custom blue/cream/pink/yellow Joker website and mobile layout | Organizer-only email/password sign-in |
| Team registration and secret rejoin code | Create, edit, disable, delete, and reorder stages |
| Explicit **Begin the Hunt** button starts each team's clock | Edit clues, locations, hints, puzzles, and answers |
| 5 seeded university-level sample puzzles and collectible playing cards | Generate and **print multiple copies of identical QR codes** |
| Native phone-camera QR links, in-site QR camera, backup code entry | Inspect and rotate backup codes and QR tokens |
| Secure checkpoint and answer validation before card unlock | View teams, record staff checkpoint verification, manually unblock |
| Hints, progress, pause-aware timer, victory certificate with confetti | Pause/resume game with timer compensation; export CSV |
| Live-style leaderboard (refreshes every 15 seconds) | Audit trail for organizer actions |

**Important:** Real registration, checkpoints, persistence, ranking, and organizer authentication require YOUR Supabase project and environment variables. There is no fake production backend or publicly accessible live server included. The five-stage game becomes playable once you complete the quick setup below.

## 1 — Install and open the project

1. Download and extract `jokers-hunt.zip`.
2. Install **Node.js 20 or newer** from <https://nodejs.org/>.
3. Open a terminal inside the extracted `jokers-hunt` folder. On Windows, open the folder in VS Code, choose **Terminal → New Terminal**.
4. Run:

   ```bash
   npm install
   ```

You will not need to write application code to use the sample hunt.

## 2 — Create the database

1. Visit <https://supabase.com/> and create a project.
2. Open **SQL Editor → New query**.
3. Copy all contents of `supabase/schema.sql` into the editor and click **Run**.
4. Under **Project Settings → API** (the exact menu label may vary), copy:
   - **Project URL**
   - The **anon/publishable key**
   - The **service_role/secret key**

Keep the service-role key PRIVATE. It bypasses row-level security and must never go in a web page, GitHub, screenshot, or `NEXT_PUBLIC_*` variable.

## 3 — Configure the secrets

Copy `.env.example` to `.env.local` in the project root.

On macOS/Linux:
```bash
cp .env.example .env.local
```

On Windows, you can copy and rename the file in File Explorer.

Edit `.env.local`:

```dotenv
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SECRET_SERVICE_ROLE_KEY
GAME_SECRET=PASTE_64_HEX_CHAR_SECRET_1
GAME_ENCRYPTION_KEY=PASTE_64_HEX_CHAR_SECRET_2
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Generate **two different** secure 64-character hex secrets by running the following command twice and pasting the outputs:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

- `GAME_SECRET` signs answers, rejoin codes, and checkpoint codes.
- `GAME_ENCRYPTION_KEY` encrypts answers and checkpoint code records so organizers can edit/reprint them.
- Keep these values unchanged during the event; rotating them invalidates existing codes or encrypted values.
- `.env.local` is git-ignored. Do not commit it.

## 4 — Add the five sample stages

From your project folder:

```bash
npm run seed
```

This inserts **five university-level sample stages** only when the stages table is empty. Each stage gets a random QR token and backup code; answer secrets are kept on the server. Seeded physical destinations are **[Campus Location 1]** through **[Campus Location 5]**.

The riddles cover wordplay, simple combinatorics, a Caesar cipher, playing-card symbols, and technology. Change them in the Admin Dashboard before the event.

## 5 — Create a secure organizer account

1. In Supabase, open **Authentication → Users**.
2. Click **Add user / Create user**, enter your organizer email and a strong password. Confirm/verify it as appropriate for your project.
3. Return to **SQL Editor** and run this, substituting your actual email:

   ```sql
   insert into public.admin_users (id)
   select id from auth.users
   where email = 'organizer@example.com'
   on conflict (id) do nothing;
   ```

4. To create more organizers, create another Authentication user and repeat the SQL with that user's email.

Merely having a Supabase login does **not** grant organizer access: the account must be listed in `public.admin_users`.

Admin sessions last **8 hours**, and team sessions last **30 days**, with session tokens stored as hashes. The access code is shown only once after team creation; teams should save it. To rejoin, they enter their **team name + secret code**.

## 6 — Run the website

```bash
npm run dev
```

Open **<http://localhost:3000>** in a browser.

- Player site: `http://localhost:3000/`
- Organizer login: `http://localhost:3000/admin`
- Public leaderboard: choose **Leaderboard** in the navigation.

To check TypeScript types:

```bash
npm run typecheck
```

For a production build:

```bash
npm run build
npm run start
```

## 7 — Edit the challenges and campus locations

1. Sign in at `/admin`.
2. Select **Stage editor**.
3. Click the edit pencil next to a stage.
4. Update the **stage title, suit, physical checkpoint label, clue, hint, puzzle, and correct answer**.
5. Save. The new content is stored in Supabase.
6. Use **New stage** to add more stages; reorder with the arrows; disable a stage without deleting it.

**Note:** Stage count is dynamic, not hardcoded to five. The UI starts with five sample cards when no team is logged in, but the active player collection uses the actual stage count. For the event, avoid changing stage order/count after teams begin without discussing the consequences with staff.

Answers are encrypted in the database and keyed-hashed for verification. They are returned only to authenticated organizers, never to the player APIs.

## 8 — Place, duplicate, and print checkpoint QR codes

1. Go to **Admin → Print checkpoints**.
2. Select a stage, then choose how many identical copies you want (1–10 per print run; repeat printing as needed).
3. Click **Print copies** and use your browser print dialog.
4. Put the same QR at several safe, visible places at that checkpoint.
5. Each printout includes the **8-character backup code**. A player who cannot scan the QR can manually enter it on their phone.
6. If all copies are removed, organizers can find the backup code in Admin and assist in person.
7. If a token is compromised, click **Rotate QR** or **Rotate backup**, then **reprint**. Rotation invalidates old copies.

Use your **final deployed domain** in `NEXT_PUBLIC_SITE_URL` before printing event QR codes. The QR encodes a URL containing a stage ID and unpredictable checkpoint token, not a correct answer.

**Important:** The QR only verifies arrival at the correct active checkpoint. The player must still solve the server-verified puzzle before collecting their next card.

## 9 — Staff verification and emergency unblock

1. Open **Admin → Teams & recovery**.
2. Select the team and its **current stage**.
3. Enter a reason (at least 8 characters).
4. Click **Verify checkpoint only** if its QR is missing or damaged. The puzzle remains required.
5. Click **Manual unblock** ONLY as a last resort; it completes the current puzzle on the organizer's authority.
6. The server records the organizer, team, stage, action, reason, and time in `public.audit_log`.

To create competitive **staff-verified-only checkpoints**, edit a stage and select **Staff verification required**. QR and backup codes will not verify that checkpoint; the on-site staff must confirm the team.

## 10 — Deploy on Vercel

1. Create a free account at <https://github.com/> and a new **private repository**.
2. Upload the project files, **excluding `.env.local`**.
3. Visit <https://vercel.com/>, choose **Add New → Project**, and import the repository.
4. Vercel should recognize **Next.js** automatically.
5. Under **Environment Variables**, add the exact same keys and secret values from your local `.env.local`.
6. For `NEXT_PUBLIC_SITE_URL`, use your deployed URL, for example `https://your-joker-hunt.vercel.app`. Do not add a trailing slash.
7. Click **Deploy**. If your domain changes later, update this variable and redeploy before printing QR signs.
8. Visit your live URL, register a test team, and sign in at `/admin`.

Supabase is the shared database for all participants; Vercel hosts the Next.js UI and authenticated API routes. You do not need to host a separate Express server.

## 11 — Test the game on phones

After deploying via HTTPS:

1. On a phone, open the website and register a **test team**; copy its access code.
2. Select **Begin the hunt**. Check the timer starts now (not at registration).
3. In Admin, print a Stage 1 QR; scan it with the phone's default camera or in-site **Scan QR** button.
4. Verify the scan. Confirm the **puzzle appears but the card is NOT completed automatically**.
5. Submit a wrong answer, then the correct answer. Verify only the correct answer flips the card.
6. Test a backup code instead of the QR, and repeat with a staff-only checkpoint.
7. Create a second team in a private/incognito browser and check leaderboard ranks.
8. Pause from Admin. The game should block completion and freeze the timer; resume and retry.
9. Close the phone browser, reopen it, and test session persistence or **Rejoin a team**.
10. Try using an out-of-order QR or editing the stage ID in the URL: it must not unlock a later card.
11. Complete all active stages to test the confetti, victory certificate, and CSV export.

**Camera note:** Modern mobile browsers require a secure context for camera access. Use the deployed **HTTPS** site. If permission is refused or the camera API is unavailable, the printed QR can be opened with the phone camera or the backup/staff method can be used.

## How the security works

- Team leader names and access codes are **not in the public leaderboard**; only public team names, number of cards, and times are returned.
- Access codes and session tokens are hashed; team and admin sessions use **HttpOnly, SameSite cookies**.
- Supabase tables have **RLS enabled** with **no public policies**. The service-role key is only used on the server.
- Admin password checks are handled using **Supabase Auth** plus an explicit allowlist.
- Correct answers never appear in player HTML, scripts, API responses, or QR content.
- The server refuses attempts to verify/solve a stage other than a team's active stage.
- Atomic SQL procedures prevent QR verification from skipping stages and require a confirmed checkpoint before completion.
- Entry attempts are rate-limited through a database-backed limiter; organizers should also use Supabase/Vercel abuse controls before a large public event.
- The leaderboard uses **pause-adjusted completion time**, based on actual start time.
- Staff overrides are authenticated and logged; manual puzzle bypass is a deliberate exceptional action.

### What QR codes cannot prove

A copied QR URL or backup code can be shared between participants. QR scanning **does not cryptographically prove physical presence**. Multiple printouts solve availability and vandalism problems, but they do not prevent collusion. For a competitive event with prizes, use **staff verification required** at sensitive checkpoints, rotate exposed codes, position staff onsite, and establish clear anti-cheating rules.

## Pages and source files

| File | Purpose |
|---|---|
| `src/app/page.tsx` | Homepage, registration, player dashboard, leaderboard, victory |
| `src/app/admin/page.tsx` | Organizer dashboard |
| `src/components/QrScanner.tsx` | Mobile browser QR camera |
| `src/app/globals.css` | Responsive styling, visual identity, animations |
| `src/app/api/**` | Authenticated game/admin server routes |
| `src/lib/server.ts` | Server-only sessions, cryptography, database, rate limiting |
| `src/lib/leaderboard.ts` | Private-data-safe public ranking |
| `supabase/schema.sql` | Tables, RLS, checkpoint/stage completion functions |
| `scripts/seed.mjs` | Five safe-to-edit sample stages |
| `public/` | Uploaded club logos and event-poster imagery |

## Production checklist

- [ ] **Pause the game in Admin until the official event start** so teams cannot begin early.
- [ ] Replace all five campus-location placeholders with verified real destinations.
- [ ] Confirm QR placements do not create crowding or unsafe situations.
- [ ] Replace sample riddles and answers as desired.
- [ ] Test every live QR and backup code **after** the final deployment.
- [ ] Appoint staff for code recovery and verify they can sign in.
- [ ] Confirm organizer accounts are allowlisted and use strong passwords.
- [ ] Consider adding a privacy notice, event rules, anti-cheating policy, and a process for deleting registration data after the event.
- [ ] For very large events, benchmark leaderboard/database queries and consider additional request throttling.
- [ ] Decide whether you want staff-only checkpoints to improve competition fairness.
- [ ] Remove test-team registrations from Supabase before the event (the Table Editor can delete test rows from `public.teams`; associated session/progress rows cascade).
- [ ] Do a complete phone test before printing hundreds of QR codes.

## Technical notes

Next.js App Router, React, Tailwind CSS, Supabase JavaScript SDK, Supabase Auth, PostgreSQL + RLS, cryptographic SHA-256/HMAC and AES-GCM, 8-hour admin sessions, 30-day team sessions, and Vercel deployment.

A working backend cannot be deployed from this ZIP without your own Supabase/Vercel accounts, which is why the setup steps are explicit. No real campus locations or credentials have been fabricated.

## November 2026: team support update

Before deploying this update to an existing database, run
`supabase/migrations/20261111_team_support.sql` in the Supabase SQL editor.
For a new database, `supabase/schema.sql` already includes these additions.
Deploy the application after the migration. Without it, the config and teams
screens cannot read their new settings.

In **Teams & recovery**:
- Set the player help phone number (blank hides it). This is public to players;
  use an event contact number rather than a private number you do not want shared.
- Search by team or leader name and select the team. Its current stage is selected
  automatically for checkpoint assistance.
- For a lost rejoin code, first verify the leader's identity in person or by phone.
  Enter a reason and choose **Replace lost rejoin code**. Share the new code privately.
  The old code and all existing device sessions are invalidated, while progress stays intact.
- **Delete selected team** requires two confirmations: a warning, then the exact team
  name and an audit reason. A signed confirmation expires after five minutes.
  Only that team and its progress/sessions are removed; stages and other teams remain.
  Deletion and recovery each write their audit record in the same database transaction.

Organizer sign-in continues to use your existing Supabase email and password.
Use your password manager's autofill to avoid typing it each time. No email/password
is embedded in the public bundle. The show-password control only reveals what you
entered on your own device. Organizer sessions are checked against the allowlist on
every protected request. Removing an organizer from the allowlist revokes their access.
Keep Supabase secrets in the deployment environment, never in Git or NEXT_PUBLIC_ variables.
The site's content security policy blocks third-party resources, embedding, plugins,
and cross-origin forms. Next.js still requires inline scripts in this configuration;
this policy complements input validation and access checks and is not a guarantee
against all attacks. JSON request bodies are limited to 64 KiB before parsing. Vulnerable Zod and PostCSS versions were updated. Keep framework dependencies updated and use HTTPS in production.

### Team names and prize contact
New access codes use eight random characters, displayed as `ABCD-EFGH`.
Old access codes continue to work. Registration requires a captain name/username
and a valid captain phone number. Each teammate joins with their own name or
username and the shared code. Returning members use the same name to avoid
creating another roster entry. Team size limits are enforced on the server.
Organizers see member names and a captain contact link in Teams & recovery;
public leaderboard responses never include these details.
For the server-backed application, apply `supabase/migrations/20261111_team_roster.sql`
before deploying this update. Existing teams keep their original captain in the
roster and show “No captain number recorded” for those older registrations.
The hosted design preview stores demo data only in the current browser.

## Organizer live display
Sign in at `/admin` and choose **Live display** to open `/admin/screen` in a
separate tab. Use **Fullscreen** for the venue screen. Standings refresh every
five seconds and rotate through pages every twelve seconds. The display shows
team names, collected cards and finish times only. Both the server-rendered page
and `/api/admin/leaderboard` require the organizer session. An expired or revoked
session hides the display on its next refresh. Public leaderboard and My Hunt
use compact layouts; the public standings paginate on smaller screens. The player
clue and hint panels have been removed.
