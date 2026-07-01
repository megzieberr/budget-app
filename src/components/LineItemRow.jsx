import { useEffect, useRef, useState } from 'react'
import { money } from '../lib/format'
import { isIncome } from '../lib/constants'
import { parseAmount } from '../lib/format'

// One line item: inline-editable amount, method tag, Paid?/Received? toggle,
// edit + delete. Colour reflects state (green paid, red unpaid, neutral zero).
export default function LineItemRow({ item, onChangeAmount, onTogglePaid, onEdit, onDelete }) {
  const [amt, setAmt] = useState(String(item.amount ?? 0))
  const dirty = useRef(false)

  useEffect(() => {
    if (!dirty.current) setAmt(String(item.amount ?? 0))
  }, [item.amount])

  const zero = Number(item.amount || 0) === 0
  const stateClass = zero ? 'zero' : item.paid ? 'paid' : 'unpaid'
  const toggleLabel = isIncome(item.section) ? 'Received' : 'Paid'

  function commitAmount() {
    dirty.current = false
    const parsed = parseAmount(amt)
    setAmt(String(parsed))
    if (parsed !== Number(item.amount || 0)) onChangeAmount(item, parsed)
  }

  return (
    <div className={`item ${stateClass}`}>
      <div className="item-body">
        <div className="item-main">
          <div className="item-label">{item.label}</div>
          <div className="item-sub">
            <span className="tag">{item.method}</span>
            {item.item_date && <span>{item.item_date}</span>}
            {item.notes && <span title={item.notes}>📝</span>}
          </div>
        </div>

        <input
          className="amount-input"
          value={amt}
          inputMode="decimal"
          onChange={(e) => {
            dirty.current = true
            setAmt(e.target.value)
          }}
          onBlur={commitAmount}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          aria-label={`${item.label} amount`}
        />
      </div>

      <div className="item-actions">
        <button
          className={`toggle ${item.paid ? 'on' : ''}`}
          onClick={() => onTogglePaid(item)}
          title={`${toggleLabel}?`}
        >
          {item.paid ? `${toggleLabel} ✓` : toggleLabel + '?'}
        </button>

        <button className="icon-btn" onClick={() => onEdit(item)} title="Edit">
          ✏️
        </button>
        <button className="icon-btn" onClick={() => onDelete(item)} title="Delete">
          🗑️
        </button>
      </div>
    </div>
  )
}
