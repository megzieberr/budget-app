import { useEffect, useState } from 'react'
import {
  listReceivables, insertReceivable, updateReceivable, deleteReceivable,
} from '../lib/api'
import { money, parseAmount } from '../lib/format'
import { todayISO } from '../lib/dates'
import { useToast } from '../context/ToastContext.jsx'

function statusFor(amount, repaid) {
  const a = Number(amount || 0)
  const r = Number(repaid || 0)
  if (r <= 0) return 'Outstanding'
  if (r < a) return 'Partly repaid'
  return 'Repaid'
}
const pillClass = { Outstanding: 'pill-out', 'Partly repaid': 'pill-part', Repaid: 'pill-paid' }

export default function OwedToMe() {
  const { showUndo, showInfo, flush } = useToast()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [sheet, setSheet] = useState(null) // { initial } add/edit
  const [repay, setRepay] = useState(null) // receivable being repaid

  async function load() {
    setLoading(true)
    try {
      setRows(await listReceivables())
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    load()
  }, [])

  const outstanding = rows
    .filter((r) => r.status !== 'Repaid')
    .reduce((s, r) => s + (Number(r.amount || 0) - Number(r.amount_repaid || 0)), 0)

  async function save(form) {
    const status = statusFor(form.amount, form.amount_repaid)
    const patch = {
      ...form,
      status,
      date_repaid: status === 'Repaid' ? form.date_repaid || todayISO() : null,
    }
    if (sheet?.initial?.id) await updateReceivable(sheet.initial.id, patch)
    else await insertReceivable(patch)
    setSheet(null)
    load()
  }

  async function applyRepayment(r, addAmount) {
    const newRepaid = Number(r.amount_repaid || 0) + Number(addAmount || 0)
    const status = statusFor(r.amount, newRepaid)
    await updateReceivable(r.id, {
      amount_repaid: newRepaid,
      status,
      date_repaid: status === 'Repaid' ? todayISO() : null,
    })
    setRepay(null)
    load()
    showInfo(status === 'Repaid' ? 'Marked fully repaid.' : 'Repayment recorded.')
  }

  function remove(r) {
    setRows((xs) => xs.filter((x) => x.id !== r.id))
    showUndo({
      message: 'Deleted.',
      onUndo: () => setRows((xs) => [r, ...xs]),
      onCommit: async () => {
        try {
          await deleteReceivable(r.id)
        } catch {
          load()
        }
      },
    })
  }

  return (
    <div>
      <div className="row-between">
        <h2 className="page-title">Owed to me</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setSheet({ initial: null })}>
          + Add
        </button>
      </div>

      <div className="stat big" style={{ marginBottom: 14 }}>
        <div className="k">Total outstanding</div>
        <div className="v">{money(outstanding)}</div>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : rows.length === 0 ? (
        <div className="card empty">Nobody owes you anything right now. 🎉</div>
      ) : (
        rows.map((r) => {
          const out = Number(r.amount || 0) - Number(r.amount_repaid || 0)
          return (
            <div className="card" key={r.id} style={{ padding: 14, marginBottom: 10 }}>
              <div className="row-between">
                <strong>{r.person}</strong>
                <span className={`pill-status ${pillClass[r.status] || 'pill-out'}`}>{r.status}</span>
              </div>
              {r.reason && <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{r.reason}</div>}
              <div className="row-between" style={{ marginTop: 8 }}>
                <div className="muted" style={{ fontSize: 13 }}>
                  {money(r.amount_repaid || 0)} of {money(r.amount)} repaid
                </div>
                <div style={{ fontWeight: 700 }}>{money(out)} left</div>
              </div>
              <div className="btn-row" style={{ marginTop: 10 }}>
                {r.status !== 'Repaid' && (
                  <button className="btn btn-sm btn-primary" onClick={() => setRepay(r)}>
                    Record repayment
                  </button>
                )}
                <button className="btn btn-sm" onClick={() => setSheet({ initial: r })}>
                  Edit
                </button>
                <button className="btn btn-sm" onClick={() => remove(r)}>
                  Delete
                </button>
              </div>
            </div>
          )
        })
      )}

      {sheet && (
        <ReceivableSheet initial={sheet.initial} onSave={save} onClose={() => setSheet(null)} />
      )}
      {repay && (
        <RepaymentSheet receivable={repay} onApply={applyRepayment} onClose={() => setRepay(null)} />
      )}
    </div>
  )
}

function ReceivableSheet({ initial, onSave, onClose }) {
  const [person, setPerson] = useState(initial?.person ?? '')
  const [amount, setAmount] = useState(initial?.amount != null ? String(initial.amount) : '')
  const [reason, setReason] = useState(initial?.reason ?? '')
  const [dateLent, setDateLent] = useState(initial?.date_lent ?? todayISO())
  const [repaid, setRepaid] = useState(initial?.amount_repaid != null ? String(initial.amount_repaid) : '0')
  const [notes, setNotes] = useState(initial?.notes ?? '')

  function submit(e) {
    e.preventDefault()
    if (!person.trim()) return
    onSave({
      person: person.trim(),
      amount: parseAmount(amount),
      reason: reason.trim() || null,
      date_lent: dateLent || null,
      amount_repaid: parseAmount(repaid),
      notes: notes.trim() || null,
      date_repaid: initial?.date_repaid ?? null,
    })
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <form className="sheet" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h3>{initial?.id ? 'Edit loan' : 'New loan to someone'}</h3>
        <div className="field">
          <label>Person</label>
          <input value={person} onChange={(e) => setPerson(e.target.value)} autoFocus placeholder="e.g. Mom" />
        </div>
        <div className="field">
          <label>Amount lent (R)</label>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0.00" />
        </div>
        <div className="field">
          <label>Reason</label>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="optional" />
        </div>
        <div className="field">
          <label>Date lent</label>
          <input type="date" value={dateLent} onChange={(e) => setDateLent(e.target.value)} />
        </div>
        <div className="field">
          <label>Already repaid (R)</label>
          <input value={repaid} onChange={(e) => setRepaid(e.target.value)} inputMode="decimal" />
        </div>
        <div className="field">
          <label>Notes</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="optional" />
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

function RepaymentSheet({ receivable, onApply, onClose }) {
  const out = Number(receivable.amount || 0) - Number(receivable.amount_repaid || 0)
  const [amount, setAmount] = useState(String(out))
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <form
        className="sheet"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          onApply(receivable, parseAmount(amount))
        }}
      >
        <h3>Record repayment — {receivable.person}</h3>
        <p className="muted" style={{ marginTop: -6 }}>{money(out)} outstanding</p>
        <div className="field">
          <label>Amount received (R)</label>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" autoFocus />
        </div>
        <div className="btn-row">
          <button type="button" className="btn btn-sm" onClick={() => setAmount(String(out))}>
            Full amount
          </button>
        </div>
        <div className="btn-row" style={{ marginTop: 10 }}>
          <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
            Save repayment
          </button>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
