# My Budget (budget-app) — instructions for Claude

## Who you're working with (READ THIS FIRST)

The owner of this project is **not a professional developer**. She built this
app with AI help and wants to genuinely understand how it works, but she does
not have a programming background. Past sessions that assumed expert knowledge
caused real stress. Your job is to be a patient guide, not a terse colleague.

### How to communicate — always

1. **Plain English first.** Explain what you're doing and why in everyday
   language BEFORE showing any code or commands. Lead with the "so what."
2. **Define every technical term the first time you use it.** Don't say
   "I'll refactor the API client to memoize responses." Say "I'll reorganize
   the code that talks to the movie database (the 'API client') so it
   remembers answers it already fetched ('memoize' = remember) instead of
   asking twice."
3. **Use analogies for concepts.** A database is a filing cabinet, an API is
   a waiter taking orders to the kitchen, a cache is a notepad by the phone,
   an environment variable is a sticky note with a secret on it that never
   gets photocopied.
4. **Never assume knowledge.** No "just," "simply," "obviously," or "as you
   know." If a step requires her to do something (open a terminal, click
   something in Netlify/Supabase), spell out exactly where to click.
5. **Small doses.** Explain one idea at a time. After a big change, give a
   3–5 sentence plain-English summary of what changed and what she would
   notice in the app — not a wall of file names.
6. **It's her app.** When you make a decision (a library, a pattern, a
   trade-off), say what you chose and why in one friendly sentence, like
   you're explaining it to a smart friend who works in a different field.
7. **Reassure, don't alarm.** If something breaks, open with what it means
   for her ("nothing is lost, the app just can't reach the database right
   now") before the technical diagnosis.
8. **Check understanding at natural pauses**, e.g. "Want me to go deeper on
   how the scorer works, or is that enough detail?"

### Things she may ask for by name

- `/explain <anything>` — she can run this skill to get a plain-English tour
  of any file, folder, error message, or concept in this project.

## What this project is (plain English)

My Budget is her **personal budget tracker** — a private money app, installed
on her phone like a normal app (a PWA), in South African Rand. Each month she
ticks off income as it arrives and bills as she pays them; the app carries the
leftover into the next month and keeps running totals for her loans, credit
card, savings pots, and money people owe her. It is single-user by design:
one fixed username (`megzieberr`), her data lives in her Supabase database.

## Technical map (for you, Claude — translate when discussing)

- **Frontend**: Vite + **React 19** in `src/` (`App.jsx`, `components/*.jsx`),
  entry `index.html` → `src/main.jsx`. Routing uses **HashRouter** with
  `base: './'` (see decision log). Styling: "Holo" neon theme in
  `src/index.css` (Orbitron/Rajdhani fonts, dark + light variants).
- **Data storage**: **Supabase only** (Postgres + Auth) — there is NO local
  mode. All reads/writes go through `src/lib/api.js` (thin wrappers; errors
  are thrown, callers surface them). The full schema + Row Level Security +
  the `seed_defaults` and `initialise_month` SQL functions live in
  `supabase/schema.sql` — that file is the source of truth for the database,
  but **it only takes effect when pasted and Run in the Supabase SQL Editor**
  (git push never touches the database).
- **Login**: fixed username, hidden synthetic email `megzieberr@budget.local`
  (`src/lib/constants.js`), logic in `src/context/AuthContext.jsx`. First-ever
  login CREATES the account with whatever password was typed. Supabase
  **"Confirm email" must be OFF** or signup succeeds without a session.
  Password reset happens in the Supabase dashboard (Auth → Users).
- **Secrets**: `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` in `.env`
  locally (gitignored) and — deliberately — in plain text in
  `.github/workflows/deploy.yml` (they are the PUBLIC client values; RLS +
  her password protect the data). The only real secret is her login password,
  which lives nowhere in the repo. Repo is public: never commit her real
  money figures either (see decision log).
- **Deploy — ONE target**: **GitHub Pages**, automatic on every push to
  `main` via `.github/workflows/deploy.yml` (build → upload → deploy-pages).
  Served under the `/budget-app/` project subpath. There is no Netlify and no
  server component. Note: the README's first paragraph says "deployed on
  Netlify" — that is stale; the workflow is the truth.
- **Domain logic worth knowing**: `src/lib/constants.js` (section order,
  payment methods, Income = only inflow), `src/lib/dates.js` (all month math,
  keys are `"YYYY-MM"` strings), `src/lib/format.js` (the ONE money
  formatter/parser — R1,234.56, comma-as-decimal tolerated),
  `src/lib/api.js#loadGlobals` (dashboard totals in one pass),
  `src/context/ToastContext.jsx` (delete-with-undo machinery).
- **PWA**: `public/manifest.webmanifest` + `public/sw.js` (minimal service
  worker: installable + instant shell, NOT full offline — data always goes to
  the network; registered in production builds only).
- **Dev**: `npm install`, copy `.env.example` → `.env` and fill in the two
  Supabase values, `npm run dev` → port **5173** (Vite's default; nothing
  overrides it). Lint: `npm run lint` (oxlint). Ignore the `start:preview`
  script — it hardcodes a Windows path to node and won't run elsewhere.
- **Docs**: README.md is the only doc (setup, how totals are computed). There
  is no PROJECT-STATUS.md yet; if a session makes ops-relevant changes,
  consider starting one.

## Decision log — what was chosen and WHY (do not silently reverse these)

- **All seeded amounts are 0 on purpose** (initial commit + comments in
  `supabase/schema.sql`): the repo is public, so no personal money figures
  may ever be committed. Real amounts are set in-app (Settings). Keep any
  new seed/template data at 0 too.
- **HashRouter + `base: './'` + relative manifest paths** so the app works
  under the GitHub Pages project subpath (`…github.io/budget-app/`) and
  survives page refreshes and home-screen installs. Absolute paths already
  broke the installed app once (commit 7c16d5a). Don't switch to
  BrowserRouter or absolute asset paths.
- **`user_id` is never sent from the client** (`src/lib/api.js` comment):
  every table defaults it to `auth.uid()` server-side and RLS enforces "own
  rows". Keep it that way — it's the security model.
- **Delete = Undo toast, not a confirm dialog** (README + ToastContext):
  the UI removes the item optimistically; the real delete runs after the
  undo window (or immediately if a new toast arrives). Preserve this pattern
  for any new deletable thing.
- **Months auto-initialise only for the current/past month; future months
  stay empty** until opened or "Start this month early" — so scheduled
  once-offs can sit in a future month un-seeded. `initialise_month` is
  idempotent, merges with existing rows, and never re-seeds. Don't "fix"
  the empty future months.
- **Single-user locked login with a synthetic email** because Supabase Auth
  requires an email and she wants a username + password, nothing more. The
  first-login-creates-account flow is intentional (README documents it).
- **Minimal service worker on purpose** (`public/sw.js`): installability and
  instant shell only, no offline data — Supabase requests always hit the
  network. Registered only in production builds to avoid dev caching
  headaches. Cache name is `budget-shell-v1`.
- **Credit-card live balance is a heuristic** (documented in `api.js` and
  README): base balance + all "Credit Card"-method spending − items whose
  LABEL contains "credit card" (case-insensitive) that aren't themselves
  card-paid. README explicitly says to correct the base balance if it
  drifts — the label matching is accepted fragility, not a bug to silently
  redesign.
- **The credit-card account column is `card_limit`, not `limit`** — `LIMIT`
  is a reserved SQL word (schema NOTE). The UI calls it "limit".
- **Holo visual theme deliberately matches her other app "Times Table
  Ascent"** (commit 9fa15a6) — restyling should stay in that family.

## Gotchas that already caused real bugs (check before planning)

1. **The database does not update from git.** Changing `supabase/schema.sql`
   does nothing until she pastes it into the Supabase SQL Editor and clicks
   Run (the file is written to be safe to re-run). Also: `seed_defaults`
   returns early once templates exist — editing the seed will NOT change an
   already-seeded account; those changes must be made in-app.
2. **PWA paths broke once.** The installed app opened the wrong path until
   `start_url`/`scope`/icon in `manifest.webmanifest` were made relative
   (commit 7c16d5a). Keep every path relative; the app lives under
   `/budget-app/`.
3. **Line-item labels clipped on phones** until rows became two-tier on
   narrow screens (commit 9fa15a6). Test any Month-view layout change at
   phone width.
4. **Supabase "Confirm email" left ON breaks first login**: signup creates
   the user but returns no session. `AuthContext.jsx` shows a specific error
   for this — don't remove that branch, and mention the setting whenever a
   fresh Supabase project is set up.
5. **README drift**: the intro says "deployed on Netlify"; the real target is
   GitHub Pages (`.github/workflows/deploy.yml`). Trust the code over the
   README when they disagree.
6. **`npm run start:preview` is Windows-only** (hardcoded
   `C:\PROGRA~1\nodejs\node.exe`). Use `npm run dev` in any non-Windows
   session.

Future sessions: when you hit a new one, append it here.

## How to plan any change here (walk this checklist, in order)

1. Read this file and skim README.md (it documents how the money totals are
   computed — carry-over, loans, credit card, savings).
2. Say the plan to Megan in plain English first — what will change in HER
   app experience — and get a nod before large changes.
3. Locate the change: money math / totals → `src/lib/api.js` (especially
   `loadGlobals`) and the SQL functions in `supabase/schema.sql`; month
   behaviour → `MonthView.jsx` + `initialise_month`; formatting →
   `src/lib/format.js` (the only money helper — never format elsewhere);
   sections/methods → `src/lib/constants.js`; login → `AuthContext.jsx`;
   look & feel → `src/index.css` (respect the Holo theme, both dark and
   light variants).
4. If `supabase/schema.sql` changes, the code change alone does nothing —
   plan the "she runs it in the Supabase SQL Editor" step and spell out
   exactly where to click. Keep the file idempotent (IF NOT EXISTS /
   CREATE OR REPLACE, never drops data).
5. Never commit real amounts, and keep seeds at 0 — the repo is public.
6. Verify in the running app (`npm run dev`, port 5173), at phone width and
   desktop width, in dark and light theme — not only by reading code.
7. If the manifest or service worker changed: keep paths relative, and bump
   the `budget-shell-v1` cache name so installed phones pick up the new
   shell.
8. Deploy = commit with a message that states the WHY and push to `main`;
   GitHub Pages rebuilds automatically (check the Actions tab if unsure).
   There is no second deploy target.
9. End with the plain-English "what changed and what you'll notice" summary.

## Working rules

- Explain any command before running it if she'll see it or need to repeat it.
- Never put secrets (API keys, Supabase keys) in committed files.
- After changes, always end with a plain-English "what changed and what
  you'll notice" summary.
