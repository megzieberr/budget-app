import { useEffect, useState } from 'react'
import { listAccounts, updateAccount, creditCardComputedDelta } from '../lib/api'
import { money, parseAmount } from '../lib/format'
import { useToast } from '../context/ToastContext.jsx'

export default function Accounts() {
  const { showInfo } = useToast()
  const [accounts, setAccounts] = useState([])
  const [cc, setCc] = useState({ spent: 0, paid: 0, delta: 0 })
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const [accs, delta] = await Promise.all([listAccounts(), creditCardComputedDelta()])
      setAccounts(accs)
      setCc(delta)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    load()
  }, [])

  async function saveField(acc, field, value) {
    setAccounts((xs) => xs.map((a) => (a.id === acc.id ? { ...a, [field]: value } : a)))
    try {
      await updateAccount(acc.id, { [field]: value })
    } catch {
      showInfo('Could not save.')
      load()
    }
  }

  if (loading) return <div className="spinner" />

  return (
    <div>
      <h2 className="page-title">Accounts</h2>

      {accounts.map((acc) => {
        const isCard = acc.type === 'credit_card'
        const owed = Number(acc.balance || 0) + (isCard ? cc.delta : 0)
        const limit = Number(acc.card_limit || 0)
        const available = limit > 0 ? limit - owed : null

        return (
          <div className="card" key={acc.id} style={{ padding: 16, marginBottom: 12 }}>
            <div className="row-between">
              <strong>{acc.name}</strong>
              <span className="tag">{isCard ? 'Credit card' : 'Bank'}</span>
            </div>

            {isCard ? (
              <>
                <div className="stat" style={{ marginTop: 12, border: 'none', padding: 0 }}>
                  <div className="k">Live balance owed</div>
                  <div className="v">{money(owed)}</div>
                </div>
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                  base {money(acc.balance || 0)} + card spend {money(cc.spent)} − payments {money(cc.paid)}
                </div>

                <div className="field" style={{ marginTop: 12 }}>
                  <label>Base balance (correct it if it drifts)</label>
                  <BlurNumber value={acc.balance} onCommit={(v) => saveField(acc, 'balance', v)} />
                </div>
                <div className="field">
                  <label>Limit</label>
                  <BlurNumber value={acc.card_limit ?? 0} onCommit={(v) => saveField(acc, 'card_limit', v)} />
                </div>
                {available != null && (
                  <div className="row-between">
                    <span className="muted">Available room</span>
                    <strong>{money(available)}</strong>
                  </div>
                )}
              </>
            ) : (
              <div className="field" style={{ marginTop: 12 }}>
                <label>Balance</label>
                <BlurNumber value={acc.balance} onCommit={(v) => saveField(acc, 'balance', v)} />
              </div>
            )}
          </div>
        )
      })}

      {accounts.length === 0 && <div className="card empty">No accounts yet.</div>}
    </div>
  )
}

// Small controlled number input that only commits on blur/enter.
function BlurNumber({ value, onCommit }) {
  const [text, setText] = useState(String(value ?? 0))
  useEffect(() => setText(String(value ?? 0)), [value])
  return (
    <input
      value={text}
      inputMode="decimal"
      onChange={(e) => setText(e.target.value)}
      onBlur={() => onCommit(parseAmount(text))}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
    />
  )
}
