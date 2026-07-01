// The one and only money helper. Store numbers, format only on display.
// South African Rand, formatted like R1,234.56.

const zar = new Intl.NumberFormat('en-ZA', {
  style: 'currency',
  currency: 'ZAR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

// Intl renders ZAR as "R 1,234.56" (non-breaking space). We want "R1,234.56".
export function money(value) {
  const n = Number(value) || 0
  return zar.format(n).replace(/\s/g, '')
}

// Parse a free-typed amount ("1 200,50", "R1,200.50", "1200.5") into a number.
export function parseAmount(input) {
  if (typeof input === 'number') return input
  if (!input) return 0
  let s = String(input).trim().replace(/[R\s]/g, '')
  // If there's a comma but no dot, treat comma as decimal separator.
  if (s.includes(',') && !s.includes('.')) s = s.replace(',', '.')
  else s = s.replace(/,/g, '') // otherwise commas are thousands separators
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : 0
}
