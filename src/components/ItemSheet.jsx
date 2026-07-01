import { useMemo, useState } from 'react'
import { METHODS, SECTION_ORDER } from '../lib/constants'
import { parseAmount } from '../lib/format'

// Bottom-sheet form to add or edit a single line item. Fast phone entry:
// numeric keypad for amount, label autocomplete from past labels.
export default function ItemSheet({
  month,
  initial,
  defaultSection,
  sections = [],
  loans = [],
  pots = [],
  labelSuggestions = [],
  onSave,
  onClose,
}) {
  const editing = Boolean(initial?.id)
  const [label, setLabel] = useState(initial?.label ?? '')
  const [amount, setAmount] = useState(
    initial?.amount != null ? String(initial.amount) : '',
  )
  const [method, setMethod] = useState(initial?.method ?? 'Bank')
  const [section, setSection] = useState(initial?.section ?? defaultSection ?? 'One-offs')
  const [customSection, setCustomSection] = useState('')
  const [itemDate, setItemDate] = useState(initial?.item_date ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [loanId, setLoanId] = useState(initial?.loan_id ?? '')
  const [showSug, setShowSug] = useState(false)

  const allSections = useMemo(() => {
    const set = new Set([...SECTION_ORDER, ...sections])
    return [...set]
  }, [sections])

  const matches = useMemo(() => {
    const q = label.trim().toLowerCase()
    if (!q) return []
    return labelSuggestions.filter((l) => l.toLowerCase().includes(q) && l.toLowerCase() !== q).slice(0, 6)
  }, [label, labelSuggestions])

  function submit(e) {
    e.preventDefault()
    const finalSection = section === '__custom__' ? customSection.trim() : section
    if (!label.trim() || !finalSection) return
    const row = {
      month,
      section: finalSection,
      label: label.trim(),
      amount: parseAmount(amount),
      method,
      item_date: itemDate || null,
      notes: notes.trim() || null,
      loan_id: loanId || null,
      pot_id: initial?.pot_id ?? null,
    }
    onSave(row)
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <form className="sheet" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h3>{editing ? 'Edit item' : 'Add item'}</h3>

        <div className="field autocomplete">
          <label>Label</label>
          <input
            value={label}
            onChange={(e) => {
              setLabel(e.target.value)
              setShowSug(true)
            }}
            onFocus={() => setShowSug(true)}
            placeholder="e.g. Groceries & Petrol"
            autoFocus={!editing}
          />
          {showSug && matches.length > 0 && (
            <div className="autocomplete-list">
              {matches.map((m) => (
                <button
                  type="button"
                  key={m}
                  onClick={() => {
                    setLabel(m)
                    setShowSug(false)
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="field">
          <label>Amount (R)</label>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="0.00"
          />
        </div>

        <div className="field">
          <label>Method</label>
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Section</label>
          <select value={section} onChange={(e) => setSection(e.target.value)}>
            {allSections.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
            <option value="__custom__">+ New section…</option>
          </select>
        </div>

        {section === '__custom__' && (
          <div className="field">
            <label>New section name</label>
            <input
              value={customSection}
              onChange={(e) => setCustomSection(e.target.value)}
              placeholder="e.g. Vet, Car repairs"
            />
          </div>
        )}

        {section === 'Debt Payments' && loans.length > 0 && (
          <div className="field">
            <label>Linked loan (optional)</label>
            <select value={loanId} onChange={(e) => setLoanId(e.target.value)}>
              <option value="">— none —</option>
              {loans.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="field">
          <label>Date (optional)</label>
          <input type="date" value={itemDate} onChange={(e) => setItemDate(e.target.value)} />
        </div>

        <div className="field">
          <label>Notes (optional)</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="" />
        </div>

        <div className="btn-row" style={{ marginTop: 8 }}>
          <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
            {editing ? 'Save' : 'Add'}
          </button>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
