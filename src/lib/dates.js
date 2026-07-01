// Month keys are always "YYYY-MM" strings. All month math lives here.

export function currentMonthKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

// Shift a "YYYY-MM" key by n months (n can be negative).
export function addMonths(monthKey, n) {
  const [y, m] = monthKey.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function prevMonth(monthKey) {
  return addMonths(monthKey, -1)
}
export function nextMonth(monthKey) {
  return addMonths(monthKey, 1)
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// "2026-07" -> "July 2026"
export function monthLabel(monthKey) {
  const [y, m] = monthKey.split('-').map(Number)
  return `${MONTHS[m - 1]} ${y}`
}

// "2026-07" -> "Jul 2026" (compact, for tight spaces)
export function monthLabelShort(monthKey) {
  const [y, m] = monthKey.split('-').map(Number)
  return `${MONTHS[m - 1].slice(0, 3)} ${y}`
}

// Today as an ISO date string "YYYY-MM-DD" for date inputs.
export function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}
