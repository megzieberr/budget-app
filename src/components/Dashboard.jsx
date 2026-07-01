import { useEffect, useState } from 'react'
import { money, parseAmount } from '../lib/format'
import { isIncome } from '../lib/constants'

// The month summary + always-on totals. Sits at the top of the Month view.
export default function Dashboard({ items, opening, onOpeningChange, globals }) {
  const [openingText, setOpeningText] = useState(String(opening ?? 0))
  useEffect(() => setOpeningText(String(opening ?? 0)), [opening])

  let income = 0
  let spending = 0
  let received = 0
  let paidOut = 0
  for (const i of items) {
    const amt = Number(i.amount || 0)
    if (isIncome(i.section)) {
      income += amt
      if (i.paid) received += amt
    } else {
      spending += amt
      if (i.paid) paidOut += amt
    }
  }

  const open = Number(opening || 0)
  const projected = open + income - spending
  const actual = open + received - paidOut

  const g = globals || {}

  return (
    <div style={{ marginBottom: 16 }}>
      <div className="stat-grid">
        <div className="stat">
          <div className="k">Opening balance</div>
          <input
            className="opening-input"
            value={openingText}
            inputMode="decimal"
            onChange={(e) => setOpeningText(e.target.value)}
            onBlur={() => onOpeningChange(parseAmount(openingText))}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            aria-label="Opening balance"
          />
        </div>
        <div className="stat">
          <div className="k">Total income</div>
          <div className="v">{money(income)}</div>
        </div>
        <div className="stat">
          <div className="k">Total spending</div>
          <div className="v">{money(spending)}</div>
        </div>
        <div className="stat">
          <div className="k">Projected left over</div>
          <div className={`v ${projected < 0 ? 'neg' : ''}`}>{money(projected)}</div>
        </div>
        <div className="stat big">
          <div className="k">Actual left over so far (received − paid)</div>
          <div className={`v ${actual < 0 ? 'neg' : 'pos'}`}>{money(actual)}</div>
        </div>
      </div>

      <div className="card subtle-list" style={{ marginTop: 12 }}>
        {(g.loans || []).map((l) => (
          <div className="subtle-row" key={l.id}>
            <span className="k">{l.name} remaining</span>
            <span className="v">{money(l.remaining)}</span>
          </div>
        ))}
        <div className="subtle-row">
          <span className="k">Credit card owed</span>
          <span className="v">{money(g.ccOwed || 0)}</span>
        </div>
        <div className="subtle-row">
          <span className="k">Total savings put away</span>
          <span className="v">{money(g.savingsTotal || 0)}</span>
        </div>
        <div className="subtle-row">
          <span className="k">Owed to me (outstanding)</span>
          <span className="v">{money(g.owedToMe || 0)}</span>
        </div>
      </div>
    </div>
  )
}
