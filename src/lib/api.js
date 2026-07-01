import { supabase } from '../supabaseClient'

// Thin wrappers around Supabase. user_id is filled server-side by the column
// default (auth.uid()) and enforced by RLS, so we never send it from the client.

function unwrap({ data, error }) {
  if (error) throw error
  return data
}

/* ----------------------------- line items ----------------------------- */

export async function listLineItems(month) {
  return unwrap(
    await supabase
      .from('line_items')
      .select('*')
      .eq('month', month)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
  )
}

export async function insertLineItem(row) {
  return unwrap(await supabase.from('line_items').insert(row).select().single())
}

export async function updateLineItem(id, patch) {
  return unwrap(await supabase.from('line_items').update(patch).eq('id', id).select().single())
}

export async function deleteLineItem(id) {
  const { error } = await supabase.from('line_items').delete().eq('id', id)
  if (error) throw error
}

// Distinct labels I've used before, most-recent first — for autocomplete.
export async function distinctLabels() {
  const data = unwrap(
    await supabase
      .from('line_items')
      .select('label, created_at')
      .order('created_at', { ascending: false })
      .limit(500),
  )
  const seen = new Set()
  const out = []
  for (const r of data) {
    const l = (r.label || '').trim()
    if (l && !seen.has(l.toLowerCase())) {
      seen.add(l.toLowerCase())
      out.push(l)
    }
  }
  return out
}

/* ------------------------------- months ------------------------------- */

export async function getMonth(month) {
  const rows = unwrap(await supabase.from('months').select('*').eq('month', month).limit(1))
  return rows[0] || null
}

// Ask the server to seed this month from templates + carry over the balance.
// Idempotent and merge-safe (scheduled once-offs are preserved).
export async function initialiseMonth(month) {
  const { error } = await supabase.rpc('initialise_month', { p_month: month })
  if (error) throw error
  return getMonth(month)
}

export async function setOpeningBalance(month, opening_balance) {
  // Upsert on (user_id, month). user_id defaults server-side.
  return unwrap(
    await supabase
      .from('months')
      .upsert({ month, opening_balance }, { onConflict: 'user_id,month' })
      .select()
      .single(),
  )
}

/* ------------------------------ templates ----------------------------- */

export async function listTemplates() {
  return unwrap(
    await supabase
      .from('templates')
      .select('*')
      .order('section', { ascending: true })
      .order('sort_order', { ascending: true }),
  )
}
export async function insertTemplate(row) {
  return unwrap(await supabase.from('templates').insert(row).select().single())
}
export async function updateTemplate(id, patch) {
  return unwrap(await supabase.from('templates').update(patch).eq('id', id).select().single())
}
export async function deleteTemplate(id) {
  const { error } = await supabase.from('templates').delete().eq('id', id)
  if (error) throw error
}

/* -------------------------------- loans ------------------------------- */

export async function listLoans() {
  return unwrap(await supabase.from('loans').select('*').order('name'))
}
export async function updateLoan(id, patch) {
  return unwrap(await supabase.from('loans').update(patch).eq('id', id).select().single())
}
export async function insertLoan(row) {
  return unwrap(await supabase.from('loans').insert(row).select().single())
}
export async function deleteLoan(id) {
  const { error } = await supabase.from('loans').delete().eq('id', id)
  if (error) throw error
}

// Sum of every paid payment linked to a loan, across all months.
export async function loanPaidTotals() {
  const data = unwrap(
    await supabase.from('line_items').select('loan_id, amount, paid').not('loan_id', 'is', null),
  )
  const totals = {}
  for (const r of data) {
    if (r.paid) totals[r.loan_id] = (totals[r.loan_id] || 0) + Number(r.amount || 0)
  }
  return totals
}

/* ------------------------------ accounts ------------------------------ */

export async function listAccounts() {
  return unwrap(await supabase.from('accounts').select('*').order('type'))
}
export async function updateAccount(id, patch) {
  return unwrap(await supabase.from('accounts').update(patch).eq('id', id).select().single())
}

// Credit-card live balance =
//   starting balance
//   + all Credit Card method spending across the app
//   - all payments labelled as credit card payments.
// A "credit card payment" = an item whose label contains "credit card" (case
// insensitive) that is NOT itself paid by the Credit Card method.
export async function creditCardComputedDelta() {
  const data = unwrap(await supabase.from('line_items').select('label, amount, method, section'))
  let spent = 0
  let paid = 0
  for (const r of data) {
    const amt = Number(r.amount || 0)
    const isCardMethod = r.method === 'Credit Card'
    const looksLikePayment = /credit\s*card/i.test(r.label || '')
    if (isCardMethod && r.section !== 'Income') spent += amt
    else if (looksLikePayment && !isCardMethod) paid += amt
  }
  return { spent, paid, delta: spent - paid }
}

/* ----------------------------- receivables ---------------------------- */

export async function listReceivables() {
  return unwrap(await supabase.from('receivables').select('*').order('created_at', { ascending: false }))
}
export async function insertReceivable(row) {
  return unwrap(await supabase.from('receivables').insert(row).select().single())
}
export async function updateReceivable(id, patch) {
  return unwrap(await supabase.from('receivables').update(patch).eq('id', id).select().single())
}
export async function deleteReceivable(id) {
  const { error } = await supabase.from('receivables').delete().eq('id', id)
  if (error) throw error
}

/* ---------------------------- savings pots ---------------------------- */

export async function listPots() {
  return unwrap(await supabase.from('savings_pots').select('*').order('name'))
}
export async function insertPot(row) {
  return unwrap(await supabase.from('savings_pots').insert(row).select().single())
}
export async function updatePot(id, patch) {
  return unwrap(await supabase.from('savings_pots').update(patch).eq('id', id).select().single())
}
export async function deletePot(id) {
  const { error } = await supabase.from('savings_pots').delete().eq('id', id)
  if (error) throw error
}

/* ------------------------------ reminders ----------------------------- */

export async function listReminders() {
  return unwrap(await supabase.from('reminders').select('*').order('created_at', { ascending: true }))
}
export async function insertReminder(row) {
  return unwrap(await supabase.from('reminders').insert(row).select().single())
}
export async function updateReminder(id, patch) {
  return unwrap(await supabase.from('reminders').update(patch).eq('id', id).select().single())
}
export async function deleteReminder(id) {
  const { error } = await supabase.from('reminders').delete().eq('id', id)
  if (error) throw error
}

/* --------------------------- export / import -------------------------- */

const ALL_TABLES = [
  'line_items', 'months', 'templates', 'loans', 'accounts',
  'receivables', 'savings_pots', 'reminders',
]

export async function exportAll() {
  const dump = { exported_at: new Date().toISOString(), version: 1, tables: {} }
  for (const t of ALL_TABLES) {
    dump.tables[t] = unwrap(await supabase.from(t).select('*'))
  }
  return dump
}

// Import restores rows. It inserts (does not wipe) — duplicates are avoided by
// upserting on primary key id. Safe belt-and-braces restore.
export async function importAll(dump) {
  const tables = dump?.tables || {}
  for (const t of ALL_TABLES) {
    const rows = tables[t]
    if (Array.isArray(rows) && rows.length) {
      const { error } = await supabase.from(t).upsert(rows, { onConflict: 'id' })
      if (error) throw error
    }
  }
}

/* -------------------------- always-on totals -------------------------- */

// One pass over all line items to compute the dashboard's global numbers,
// plus the supporting rows. Kept in a single loader to minimise round trips.
export async function loadGlobals() {
  const [itemsRes, loans, accounts, pots, receivables] = await Promise.all([
    supabase.from('line_items').select('loan_id, pot_id, amount, paid, method, section, label'),
    listLoans(),
    listAccounts(),
    listPots(),
    listReceivables(),
  ])
  const rows = unwrap(itemsRes)

  const loanPaid = {}
  let ccSpent = 0
  let ccPaid = 0
  let savingsNoPot = 0

  for (const r of rows) {
    const amt = Number(r.amount || 0)
    if (r.paid && r.loan_id) loanPaid[r.loan_id] = (loanPaid[r.loan_id] || 0) + amt
    if (r.method === 'Credit Card' && r.section !== 'Income') ccSpent += amt
    else if (/credit\s*card/i.test(r.label || '') && r.method !== 'Credit Card') ccPaid += amt
    // Savings put away directly (pot-linked savings are counted via the pot)
    if (r.section === 'Savings' && r.paid && !r.pot_id) savingsNoPot += amt
  }

  const loansOut = loans.map((l) => ({
    ...l,
    remaining: Number(l.starting_balance || 0) - (loanPaid[l.id] || 0),
  }))
  const cc = accounts.find((a) => a.type === 'credit_card') || null
  const ccOwed = cc ? Number(cc.balance || 0) + ccSpent - ccPaid : 0
  const savingsTotal =
    pots.reduce((s, p) => s + Number(p.current_amount || 0), 0) + savingsNoPot
  const owedToMe = receivables
    .filter((r) => r.status !== 'Repaid')
    .reduce((s, r) => s + (Number(r.amount || 0) - Number(r.amount_repaid || 0)), 0)

  return { loans: loansOut, accounts, pots, cc, ccOwed, savingsTotal, owedToMe, receivables }
}

// Add money to a savings pot and mirror it as a paid Savings line item in the
// given month, so it shows up in that month and links back to the pot.
export async function addPotContribution(pot, amount, month) {
  const newAmt = Number(pot.current_amount || 0) + Number(amount || 0)
  await updatePot(pot.id, { current_amount: newAmt })
  await insertLineItem({
    month,
    section: 'Savings',
    label: `${pot.name} (savings)`,
    amount: Number(amount || 0),
    method: 'Bank',
    paid: true,
    pot_id: pot.id,
    sort_order: 999,
  })
  return newAmt
}

// Copy every line item from `fromMonth` into `toMonth`, reset to unpaid.
export async function copyMonth(fromMonth, toMonth) {
  const src = await listLineItems(fromMonth)
  if (!src.length) return 0
  const copies = src.map((r) => ({
    month: toMonth,
    section: r.section,
    label: r.label,
    amount: r.amount,
    method: r.method,
    paid: false,
    loan_id: r.loan_id,
    pot_id: r.pot_id,
    sort_order: r.sort_order,
  }))
  const { error } = await supabase.from('line_items').insert(copies)
  if (error) throw error
  return copies.length
}
