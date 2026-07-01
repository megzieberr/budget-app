# My Budget

A personal budget tracker. React + Vite frontend, Supabase (Postgres + Auth) backend,
deployed on Netlify. Single user, South African Rand.

## First-time setup

### 1. Supabase database
1. Open your Supabase project → **SQL Editor**.
2. Paste the whole of [`supabase/schema.sql`](supabase/schema.sql) and **Run**.
   This creates every table, Row Level Security policy, and the `seed_defaults`
   and `initialise_month` functions.
3. Go to **Authentication → Providers → Email** and turn **Confirm email OFF**
   (there is no real email — login uses a hidden `megzieberr@budget.local`).

### 2. App config
1. Copy `.env.example` to `.env`.
2. From **Project Settings → API**, copy the **Project URL** and the **anon public**
   key into `.env`:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
3. `npm install` then `npm run dev`.

### 3. First login
- Username is fixed to `megzieberr`.
- Type any password and press Sign in — that **becomes** your password and creates
  the account. Every login after that uses the same password.
- On first login the app seeds your default templates, loans, accounts, and reminder.
- Forgot the password? Reset it directly in the Supabase dashboard (Auth → Users).

## Deploy to GitHub Pages
- Push to the `main` branch of a GitHub repo.
- In the repo: **Settings → Pages → Build and deployment → Source = GitHub Actions**.
- `.github/workflows/deploy.yml` builds with Vite and publishes automatically on
  every push. The Supabase public client values are set in the workflow's `env:`
  block (safe to expose — RLS + your password protect the data).
- Routing uses `HashRouter` and `base: './'` so it works under the
  `https://<user>.github.io/<repo>/` project subpath and survives page refreshes.

## How a few things work
- **Months** auto-initialise from your template when you open the current month or a
  past one, carrying the previous month's closing balance in as the opening balance.
  Future months stay empty until you open them or press *Start this month early*, so
  scheduled once-offs can wait there.
- **Loans** balance remaining = starting balance − every paid payment linked to that loan.
- **Credit card** live balance = base balance + all Credit-Card-method spending −
  payments whose label mentions "credit card". Correct the base balance if it drifts.
- **Savings total** = money in pots + paid Savings items not linked to a pot.
- **Delete** anywhere shows an *Undo* toast instead of a confirm dialog.
- **Backup**: Settings → Data → Export/Import JSON. Cloud is the main safety net.
