-- ============================================================================
--  Personal Budget App — full schema, RLS, seed + month-init functions
--  Run this ONCE in the Supabase SQL editor for your project.
--  Safe to re-run: it uses IF NOT EXISTS / CREATE OR REPLACE and never drops data.
-- ============================================================================

-- gen_random_uuid() ships with Supabase (pgcrypto). Ensure it's there anyway.
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
--  Shared column contract (every table): id, user_id, created_at
--  Every table: RLS on, single "own rows" policy (user_id = auth.uid()).
-- ----------------------------------------------------------------------------

-- === line_items : the rows inside each month ================================
create table if not exists public.line_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid(),
  created_at  timestamptz default now(),
  month       text not null,              -- "2026-07"
  section     text not null,              -- Income / Debt Payments / ... / custom
  label       text not null,
  amount      numeric not null default 0,
  method      text not null default 'Bank',   -- Bank | Credit Card | Cash | Other
  paid        boolean not null default false, -- expenses = Paid; Income = Received
  loan_id     uuid,   -- FK to loans added after all tables exist (see below)
  pot_id      uuid,   -- FK to savings_pots added after all tables exist
  item_date   date,
  notes       text,
  sort_order  int not null default 0
);

-- === months : which months are set up, plus carry-over =====================
create table if not exists public.months (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid(),
  created_at       timestamptz default now(),
  month            text not null,          -- "2026-07"
  initialised      boolean not null default false,
  opening_balance  numeric not null default 0,
  unique (user_id, month)
);

-- === templates : recurring defaults copied into each new month =============
create table if not exists public.templates (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid(),
  created_at  timestamptz default now(),
  section     text not null,
  label       text not null,
  amount      numeric not null default 0,
  method      text not null default 'Bank',
  loan_id     uuid,
  pot_id      uuid,
  sort_order  int not null default 0
);

-- === loans : balances that decrease as payments are marked paid ============
create table if not exists public.loans (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid(),
  created_at        timestamptz default now(),
  name              text not null,
  starting_balance  numeric not null default 0,
  monthly_payment   numeric not null default 0
);

-- === accounts : bank + credit card =========================================
--  NOTE: spec calls it "limit" but LIMIT is a reserved SQL word, so the column
--  is card_limit. The app maps it to "limit" in the UI.
create table if not exists public.accounts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid(),
  created_at  timestamptz default now(),
  name        text not null,
  type        text not null,              -- bank | credit_card
  balance     numeric not null default 0,
  card_limit  numeric
);

-- === receivables : money people owe me =====================================
create table if not exists public.receivables (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid(),
  created_at     timestamptz default now(),
  person         text not null,
  amount         numeric not null default 0,   -- original amount lent
  reason         text,
  date_lent      date,
  amount_repaid  numeric not null default 0,
  status         text not null default 'Outstanding', -- Outstanding | Partly repaid | Repaid
  date_repaid    date,
  notes          text
);

-- === savings_pots : sinking funds ==========================================
create table if not exists public.savings_pots (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid(),
  created_at     timestamptz default now(),
  name           text not null,
  target_amount  numeric not null default 0,
  current_amount numeric not null default 0
);

-- === reminders =============================================================
create table if not exists public.reminders (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid(),
  created_at  timestamptz default now(),
  text        text not null,
  done        boolean not null default false
);

-- line_items.loan_id / pot_id FKs are declared inline above; if the referenced
-- tables were created after line_items on a fresh run, add them defensively:
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'line_items_loan_id_fkey') then
    alter table public.line_items
      add constraint line_items_loan_id_fkey
      foreign key (loan_id) references public.loans(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'line_items_pot_id_fkey') then
    alter table public.line_items
      add constraint line_items_pot_id_fkey
      foreign key (pot_id) references public.savings_pots(id) on delete set null;
  end if;
end $$;

-- Helpful indexes for the app's hot paths.
create index if not exists idx_line_items_user_month on public.line_items (user_id, month);
create index if not exists idx_line_items_loan on public.line_items (loan_id);
create index if not exists idx_templates_user on public.templates (user_id);

-- ----------------------------------------------------------------------------
--  Row Level Security — one "own rows" policy per table for ALL operations
-- ----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'line_items','months','templates','loans','accounts',
    'receivables','savings_pots','reminders'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "own rows" on public.%I;', t);
    execute format(
      'create policy "own rows" on public.%I for all
         using (user_id = auth.uid())
         with check (user_id = auth.uid());', t);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
--  seed_defaults() — populate a brand-new account with my current situation.
--  Idempotent: does nothing if templates already exist for this user.
-- ----------------------------------------------------------------------------
create or replace function public.seed_defaults()
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_micro uuid;
  v_car   uuid;
begin
  if exists (select 1 from public.templates where user_id = auth.uid()) then
    return;  -- already seeded, never overwrite
  end if;

  -- Loans. Amounts start at 0 so no personal figures live in this public repo —
  -- set the real balance + monthly payment in the app (Settings → Loans).
  insert into public.loans (name, starting_balance, monthly_payment)
    values ('Micro Loan', 0, 0) returning id into v_micro;
  insert into public.loans (name, starting_balance, monthly_payment)
    values ('Car Loan', 0, 0) returning id into v_car;

  -- Accounts
  insert into public.accounts (name, type, balance, card_limit) values
    ('Bank',        'bank',        0, null),
    ('Credit Card', 'credit_card', 0, null);  -- limit reduction still pending

  -- Reminders
  insert into public.reminders (text, done) values
    ('Reduce credit card limit at the bank', false);

  -- Recurring templates (Income + Debt + Expenses + Subs + Savings).
  -- Amounts start at 0 (this repo is public — no personal figures committed).
  -- Set your real amounts once in the app: Settings → Recurring template.
  -- One-offs section is intentionally empty. No credit-card debit order,
  -- no "Pay back Dad" — card is paid off and Dad is settled.
  insert into public.templates (section, label, amount, method, loan_id, pot_id, sort_order) values
    ('Income',           'Extra Classes',              0, 'Bank', null,    null, 0),
    ('Income',           'Mindbourne',                 0, 'Bank', null,    null, 1),
    ('Debt Payments',    'Micro Loan',                 0, 'Bank', v_micro, null, 0),
    ('Debt Payments',    'Car Loan (Vehicle Finance)', 0, 'Bank', v_car,   null, 1),
    ('Monthly Expenses', 'Insurance',                  0, 'Bank', null,    null, 0),
    ('Monthly Expenses', 'PAYE / Tax',                 0, 'Bank', null,    null, 1),
    ('Monthly Expenses', 'Accountant',                 0, 'Bank', null,    null, 2),
    ('Monthly Expenses', 'Electricity',                0, 'Bank', null,    null, 3),
    ('Monthly Expenses', 'Groceries & Petrol',         0, 'Bank', null,    null, 4),
    ('Subscriptions',    'Claude',                     0, 'Bank', null,    null, 0),
    ('Subscriptions',    'iLovePDF',                   0, 'Bank', null,    null, 1),
    ('Subscriptions',    'Checkers 60/60',             0, 'Bank', null,    null, 2),
    ('Subscriptions',    'Truecaller',                 0, 'Bank', null,    null, 3),
    ('Savings',          'Savings',                    0, 'Bank', null,    null, 0);
end;
$$;

-- ----------------------------------------------------------------------------
--  initialise_month(p_month) — copy the template into a month, carry over the
--  previous month's closing balance, mark initialised. NEVER re-seeds, and
--  MERGES with any scheduled future once-offs already sitting in that month.
-- ----------------------------------------------------------------------------
create or replace function public.initialise_month(p_month text)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_prev       text;
  v_prev_close numeric := 0;
  v_already    boolean;
begin
  select initialised into v_already
    from public.months
    where user_id = auth.uid() and month = p_month;

  if v_already then
    return;  -- already initialised, do not touch
  end if;

  -- previous calendar month, "YYYY-MM"
  v_prev := to_char(
    (to_date(p_month || '-01', 'YYYY-MM-DD') - interval '1 month'), 'YYYY-MM');

  -- previous month's closing position = opening + received income - paid outflow
  select coalesce(m.opening_balance, 0)
       + coalesce(sum(case when li.section = 'Income' and li.paid then li.amount else 0 end), 0)
       - coalesce(sum(case when li.section <> 'Income' and li.paid then li.amount else 0 end), 0)
    into v_prev_close
    from public.months m
    left join public.line_items li
      on li.user_id = m.user_id and li.month = m.month
    where m.user_id = auth.uid() and m.month = v_prev
    group by m.opening_balance;

  -- copy the recurring template in (does not remove scheduled once-offs)
  insert into public.line_items
    (month, section, label, amount, method, paid, loan_id, pot_id, sort_order)
  select p_month, t.section, t.label, t.amount, t.method, false,
         t.loan_id, t.pot_id, t.sort_order
    from public.templates t
    where t.user_id = auth.uid();

  insert into public.months (month, initialised, opening_balance)
    values (p_month, true, coalesce(v_prev_close, 0))
    on conflict (user_id, month)
    do update set initialised = true, opening_balance = excluded.opening_balance;
end;
$$;

-- ============================================================================
--  Done. Next: sign in once in the app (creates the auth user), then the app
--  calls seed_defaults() automatically. Or run  select public.seed_defaults();
--  yourself after your first login.
-- ============================================================================
