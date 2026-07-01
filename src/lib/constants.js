// Shared constants used across screens.

// The canonical order sections appear in a month. Custom sections (anything
// not in this list) are appended after these, alphabetically.
export const SECTION_ORDER = [
  'Income',
  'Debt Payments',
  'Monthly Expenses',
  'Subscriptions',
  'One-offs',
  'Savings',
]

export const METHODS = ['Bank', 'Credit Card', 'Cash', 'Other']

// Income is the only inflow section. Everything else is an outflow (spending),
// including Savings — money leaving the current account counts against left-over.
export const INCOME_SECTION = 'Income'

export function isIncome(section) {
  return section === INCOME_SECTION
}

// Sort a list of section names into display order.
export function sortSections(sections) {
  const known = SECTION_ORDER.filter((s) => sections.includes(s))
  const custom = sections
    .filter((s) => !SECTION_ORDER.includes(s))
    .sort((a, b) => a.localeCompare(b))
  return [...known, ...custom]
}

// Locked single-user login. The username is fixed; a hidden synthetic email is
// what actually talks to Supabase Auth (Supabase requires an email).
export const FIXED_USERNAME = 'megzieberr'
export const SYNTHETIC_EMAIL = 'megzieberr@budget.local'
