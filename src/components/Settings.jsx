import { useEffect, useRef, useState } from 'react'
import {
  listTemplates, insertTemplate, updateTemplate, deleteTemplate,
  listLoans, insertLoan, updateLoan, deleteLoan,
  listReminders, insertReminder, updateReminder, deleteReminder,
  exportAll, importAll,
} from '../lib/api'
import { METHODS, SECTION_ORDER, sortSections } from '../lib/constants'
import { parseAmount, money } from '../lib/format'
import { useTheme } from '../context/ThemeContext.jsx'
import { useToast } from '../context/ToastContext.jsx'

export default function Settings() {
  const { theme, toggle } = useTheme()
  const { showUndo, showInfo } = useToast()
  const [templates, setTemplates] = useState([])
  const [loans, setLoans] = useState([])
  const [reminders, setReminders] = useState([])
  const [loading, setLoading] = useState(true)
  const [newReminder, setNewReminder] = useState('')
  const fileRef = useRef(null)

  async function load() {
    setLoading(true)
    try {
      const [t, l, r] = await Promise.all([listTemplates(), listLoans(), listReminders()])
      setTemplates(t)
      setLoans(l)
      setReminders(r)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    load()
  }, [])

  /* templates */
  function patchTemplateLocal(id, patch) {
    setTemplates((xs) => xs.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }
  async function saveTemplate(id, patch) {
    patchTemplateLocal(id, patch)
    try {
      await updateTemplate(id, patch)
    } catch {
      showInfo('Could not save template.')
      load()
    }
  }
  async function addTemplate() {
    const row = await insertTemplate({ section: 'Monthly Expenses', label: 'New item', amount: 0, method: 'Bank', sort_order: 99 })
    setTemplates((xs) => [...xs, row])
  }
  function removeTemplate(t) {
    setTemplates((xs) => xs.filter((x) => x.id !== t.id))
    showUndo({
      message: 'Template removed.',
      onUndo: () => setTemplates((xs) => [...xs, t]),
      onCommit: async () => {
        try {
          await deleteTemplate(t.id)
        } catch {
          load()
        }
      },
    })
  }

  /* loans */
  async function saveLoan(id, patch) {
    setLoans((xs) => xs.map((l) => (l.id === id ? { ...l, ...patch } : l)))
    try {
      await updateLoan(id, patch)
    } catch {
      showInfo('Could not save loan.')
      load()
    }
  }
  async function addLoan() {
    const row = await insertLoan({ name: 'New loan', starting_balance: 0, monthly_payment: 0 })
    setLoans((xs) => [...xs, row])
  }
  async function removeLoan(l) {
    if (!window.confirm(`Delete loan "${l.name}"? Linked payments will be unlinked.`)) return
    await deleteLoan(l.id)
    load()
  }

  /* reminders */
  async function addReminder() {
    if (!newReminder.trim()) return
    const row = await insertReminder({ text: newReminder.trim(), done: false })
    setReminders((xs) => [...xs, row])
    setNewReminder('')
  }
  async function toggleReminder(r) {
    setReminders((xs) => xs.map((x) => (x.id === r.id ? { ...x, done: !x.done } : x)))
    await updateReminder(r.id, { done: !r.done })
  }
  function removeReminder(r) {
    setReminders((xs) => xs.filter((x) => x.id !== r.id))
    showUndo({
      message: 'Reminder deleted.',
      onUndo: () => setReminders((xs) => [...xs, r]),
      onCommit: async () => {
        try {
          await deleteReminder(r.id)
        } catch {
          load()
        }
      },
    })
  }

  /* export / import */
  async function doExport() {
    try {
      const dump = await exportAll()
      const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const stamp = new Date().toISOString().slice(0, 10)
      a.href = url
      a.download = `budget-backup-${stamp}.json`
      a.click()
      URL.revokeObjectURL(url)
      showInfo('Backup downloaded.')
    } catch {
      showInfo('Export failed.')
    }
  }
  async function doImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const dump = JSON.parse(text)
      await importAll(dump)
      showInfo('Backup imported.')
      load()
    } catch {
      showInfo('Import failed — is it a valid backup file?')
    } finally {
      e.target.value = ''
    }
  }

  if (loading) return <div className="spinner" />

  const sections = sortSections([...new Set([...SECTION_ORDER, ...templates.map((t) => t.section)])])

  return (
    <div>
      <h2 className="page-title">Settings</h2>

      {/* Appearance */}
      <div className="card" style={{ padding: 16, marginBottom: 14 }}>
        <div className="row-between">
          <strong>Dark mode</strong>
          <button className={`toggle ${theme === 'dark' ? 'on' : ''}`} onClick={toggle}>
            {theme === 'dark' ? 'On' : 'Off'}
          </button>
        </div>
      </div>

      {/* Templates */}
      <div className="section card">
        <div className="section-head">
          <h3>Recurring template</h3>
          <button className="btn btn-sm" onClick={addTemplate}>+ Add</button>
        </div>
        <div style={{ padding: 8 }}>
          {templates
            .slice()
            .sort((a, b) => sections.indexOf(a.section) - sections.indexOf(b.section) || (a.sort_order - b.sort_order))
            .map((t) => (
              <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 6, padding: '8px 6px', borderBottom: '1px solid var(--border)' }}>
                <input value={t.label} onChange={(e) => patchTemplateLocal(t.id, { label: e.target.value })} onBlur={(e) => saveTemplate(t.id, { label: e.target.value })} />
                <input
                  style={{ width: 96, textAlign: 'right' }}
                  value={t.amount}
                  inputMode="decimal"
                  onChange={(e) => patchTemplateLocal(t.id, { amount: e.target.value })}
                  onBlur={(e) => saveTemplate(t.id, { amount: parseAmount(e.target.value) })}
                />
                <select value={t.section} onChange={(e) => saveTemplate(t.id, { section: e.target.value })}>
                  {sections.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <div style={{ display: 'flex', gap: 6 }}>
                  <select value={t.method} onChange={(e) => saveTemplate(t.id, { method: e.target.value })} style={{ flex: 1 }}>
                    {METHODS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <button className="icon-btn" onClick={() => removeTemplate(t)}>🗑️</button>
                </div>
              </div>
            ))}
          {templates.length === 0 && <div className="empty">No template items.</div>}
        </div>
      </div>

      {/* Loans */}
      <div className="section card">
        <div className="section-head">
          <h3>Loans</h3>
          <button className="btn btn-sm" onClick={addLoan}>+ Add</button>
        </div>
        <div style={{ padding: 8 }}>
          {loans.map((l) => (
            <div key={l.id} style={{ padding: '8px 6px', borderBottom: '1px solid var(--border)' }}>
              <input value={l.name} onChange={(e) => setLoans((xs) => xs.map((x) => (x.id === l.id ? { ...x, name: e.target.value } : x)))} onBlur={(e) => saveLoan(l.id, { name: e.target.value })} style={{ marginBottom: 6 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <label className="muted" style={{ fontSize: 12, flex: 1 }}>
                  Current balance
                  <input value={l.starting_balance} inputMode="decimal" onChange={(e) => setLoans((xs) => xs.map((x) => (x.id === l.id ? { ...x, starting_balance: e.target.value } : x)))} onBlur={(e) => saveLoan(l.id, { starting_balance: parseAmount(e.target.value) })} />
                </label>
                <label className="muted" style={{ fontSize: 12, flex: 1 }}>
                  Monthly payment
                  <input value={l.monthly_payment} inputMode="decimal" onChange={(e) => setLoans((xs) => xs.map((x) => (x.id === l.id ? { ...x, monthly_payment: e.target.value } : x)))} onBlur={(e) => saveLoan(l.id, { monthly_payment: parseAmount(e.target.value) })} />
                </label>
                <button className="icon-btn" style={{ alignSelf: 'flex-end' }} onClick={() => removeLoan(l)}>🗑️</button>
              </div>
            </div>
          ))}
          {loans.length === 0 && <div className="empty">No loans.</div>}
        </div>
      </div>

      {/* Reminders */}
      <div className="section card">
        <div className="section-head">
          <h3>Reminders</h3>
        </div>
        <div style={{ padding: 8 }}>
          {reminders.map((r) => (
            <div key={r.id} className="row-between" style={{ padding: '8px 6px' }}>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 1 }}>
                <input type="checkbox" checked={r.done} onChange={() => toggleReminder(r)} />
                <span style={{ textDecoration: r.done ? 'line-through' : 'none', color: r.done ? 'var(--muted)' : 'inherit' }}>{r.text}</span>
              </label>
              <button className="icon-btn" onClick={() => removeReminder(r)}>🗑️</button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 6, padding: '8px 6px' }}>
            <input value={newReminder} onChange={(e) => setNewReminder(e.target.value)} placeholder="New reminder" onKeyDown={(e) => e.key === 'Enter' && addReminder()} />
            <button className="btn btn-sm" onClick={addReminder}>Add</button>
          </div>
        </div>
      </div>

      {/* Data */}
      <div className="section card">
        <div className="section-head">
          <h3>Data backup</h3>
        </div>
        <div style={{ padding: 14 }}>
          <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
            Cloud sync is your main safety net. This is a manual extra backup.
          </p>
          <div className="btn-row">
            <button className="btn" onClick={doExport}>Export JSON</button>
            <button className="btn" onClick={() => fileRef.current?.click()}>Import JSON</button>
            <input ref={fileRef} type="file" accept="application/json" hidden onChange={doImport} />
          </div>
        </div>
      </div>
    </div>
  )
}
