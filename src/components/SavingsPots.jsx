import { useEffect, useState } from 'react'
import { listPots, insertPot, updatePot, deletePot, addPotContribution } from '../lib/api'
import { money, parseAmount } from '../lib/format'
import { currentMonthKey } from '../lib/dates'
import { useToast } from '../context/ToastContext.jsx'

export default function SavingsPots() {
  const { showUndo, showInfo } = useToast()
  const [pots, setPots] = useState([])
  const [loading, setLoading] = useState(true)
  const [sheet, setSheet] = useState(null) // { initial } create/edit
  const [contribute, setContribute] = useState(null)

  async function load() {
    setLoading(true)
    try {
      setPots(await listPots())
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    load()
  }, [])

  async function save(form) {
    if (sheet?.initial?.id) await updatePot(sheet.initial.id, form)
    else await insertPot(form)
    setSheet(null)
    load()
  }

  async function doContribute(pot, amount) {
    try {
      await addPotContribution(pot, amount, currentMonthKey())
      setContribute(null)
      load()
      showInfo(`Added ${money(amount)} to ${pot.name}.`)
    } catch {
      showInfo('Could not add to pot.')
    }
  }

  function remove(pot) {
    setPots((xs) => xs.filter((x) => x.id !== pot.id))
    showUndo({
      message: 'Pot deleted.',
      onUndo: () => setPots((xs) => [...xs, pot].sort((a, b) => a.name.localeCompare(b.name))),
      onCommit: async () => {
        try {
          await deletePot(pot.id)
        } catch {
          load()
        }
      },
    })
  }

  return (
    <div>
      <div className="row-between">
        <h2 className="page-title">Savings pots</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setSheet({ initial: null })}>
          + New pot
        </button>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : pots.length === 0 ? (
        <div className="card empty">No pots yet. Create one to save toward a goal.</div>
      ) : (
        pots.map((p) => {
          const cur = Number(p.current_amount || 0)
          const tgt = Number(p.target_amount || 0)
          const pct = tgt > 0 ? Math.min(100, Math.round((cur / tgt) * 100)) : 0
          return (
            <div className="card" key={p.id} style={{ padding: 16, marginBottom: 12 }}>
              <div className="row-between">
                <strong>{p.name}</strong>
                <span className="muted">{pct}%</span>
              </div>
              <div className="row-between" style={{ margin: '6px 0 8px' }}>
                <span style={{ fontWeight: 700 }}>{money(cur)}</span>
                <span className="muted">of {money(tgt)}</span>
              </div>
              <div className="progress">
                <span style={{ width: `${pct}%` }} />
              </div>
              <div className="btn-row" style={{ marginTop: 12 }}>
                <button className="btn btn-sm btn-primary" onClick={() => setContribute(p)}>
                  Add money
                </button>
                <button className="btn btn-sm" onClick={() => setSheet({ initial: p })}>
                  Edit
                </button>
                <button className="btn btn-sm" onClick={() => remove(p)}>
                  Delete
                </button>
              </div>
            </div>
          )
        })
      )}

      {sheet && <PotSheet initial={sheet.initial} onSave={save} onClose={() => setSheet(null)} />}
      {contribute && (
        <ContributeSheet pot={contribute} onApply={doContribute} onClose={() => setContribute(null)} />
      )}
    </div>
  )
}

function PotSheet({ initial, onSave, onClose }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [target, setTarget] = useState(initial?.target_amount != null ? String(initial.target_amount) : '')
  const [current, setCurrent] = useState(initial?.current_amount != null ? String(initial.current_amount) : '0')

  function submit(e) {
    e.preventDefault()
    if (!name.trim()) return
    onSave({
      name: name.trim(),
      target_amount: parseAmount(target),
      current_amount: parseAmount(current),
    })
  }
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <form className="sheet" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h3>{initial?.id ? 'Edit pot' : 'New savings pot'}</h3>
        <div className="field">
          <label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="e.g. Laptop" />
        </div>
        <div className="field">
          <label>Target amount (R)</label>
          <input value={target} onChange={(e) => setTarget(e.target.value)} inputMode="decimal" placeholder="0.00" />
        </div>
        <div className="field">
          <label>Amount saved so far (R)</label>
          <input value={current} onChange={(e) => setCurrent(e.target.value)} inputMode="decimal" />
        </div>
        <div className="btn-row">
          <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
            Save
          </button>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

function ContributeSheet({ pot, onApply, onClose }) {
  const [amount, setAmount] = useState('')
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <form
        className="sheet"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          const a = parseAmount(amount)
          if (a > 0) onApply(pot, a)
        }}
      >
        <h3>Add money to {pot.name}</h3>
        <p className="muted" style={{ marginTop: -6 }}>
          Also logged as a Savings item in this month.
        </p>
        <div className="field">
          <label>Amount (R)</label>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" autoFocus placeholder="0.00" />
        </div>
        <div className="btn-row">
          <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
            Add
          </button>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
