import LineItemRow from './LineItemRow.jsx'
import { money } from '../lib/format'

// A section card: header with running total, its line items, and a quick add.
export default function SectionBlock({ section, items, onAdd, onChangeAmount, onTogglePaid, onEdit, onDelete }) {
  const total = items.reduce((s, i) => s + Number(i.amount || 0), 0)

  return (
    <section className="section card">
      <div className="section-head">
        <h3>{section}</h3>
        <span className="section-total">{money(total)}</span>
      </div>

      {items.map((item) => (
        <LineItemRow
          key={item.id}
          item={item}
          onChangeAmount={onChangeAmount}
          onTogglePaid={onTogglePaid}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}

      <button className="add-item" onClick={() => onAdd(section)}>
        + Add item
      </button>
    </section>
  )
}
