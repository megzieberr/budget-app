import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getMonth, initialiseMonth, listLineItems, setOpeningBalance,
  insertLineItem, updateLineItem, deleteLineItem, distinctLabels,
  loadGlobals, copyMonth,
} from '../lib/api'
import { currentMonthKey, prevMonth, nextMonth, monthLabel } from '../lib/dates'
import { sortSections } from '../lib/constants'
import { useToast } from '../context/ToastContext.jsx'
import Dashboard from './Dashboard.jsx'
import SectionBlock from './SectionBlock.jsx'
import ItemSheet from './ItemSheet.jsx'

export default function MonthView() {
  const { showUndo, showInfo, flush } = useToast()
  const [month, setMonth] = useState(currentMonthKey())
  const [monthRow, setMonthRow] = useState(null)
  const [items, setItems] = useState([])
  const [globals, setGlobals] = useState(null)
  const [labels, setLabels] = useState([])
  const [loading, setLoading] = useState(true)
  const [sheet, setSheet] = useState(null) // { initial, defaultSection }

  const refreshGlobals = useCallback(() => {
    loadGlobals().then(setGlobals).catch(() => {})
  }, [])

  const load = useCallback(async (m) => {
    setLoading(true)
    try {
      let row = await getMonth(m)
      // Auto-initialise current/past months on open. Future months wait until
      // you start them (so scheduled once-offs can sit there un-seeded).
      if ((!row || !row.initialised) && m <= currentMonthKey()) {
        row = await initialiseMonth(m)
      }
      const [its, gl, lbls] = await Promise.all([
        listLineItems(m),
        loadGlobals(),
        distinctLabels(),
      ])
      setMonthRow(row)
      setItems(its)
      setGlobals(gl)
      setLabels(lbls)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e)
      showInfo('Could not load this month.')
    } finally {
      setLoading(false)
    }
  }, [showInfo])

  useEffect(() => {
    flush() // commit any pending delete before switching months
    load(month)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month])

  const grouped = useMemo(() => {
    const map = {}
    for (const it of items) {
      ;(map[it.section] ||= []).push(it)
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => (a.sort_order - b.sort_order) || a.created_at.localeCompare(b.created_at))
    }
    return map
  }, [items])

  const sections = useMemo(() => sortSections(Object.keys(grouped)), [grouped])
  const isFuture = month > currentMonthKey()
  const initialised = monthRow?.initialised

  /* ----- mutations ----- */

  async function handleChangeAmount(item, amount) {
    setItems((xs) => xs.map((x) => (x.id === item.id ? { ...x, amount } : x)))
    try {
      await updateLineItem(item.id, { amount })
      refreshGlobals()
    } catch {
      showInfo('Save failed — check your connection.')
      load(month)
    }
  }

  async function handleTogglePaid(item) {
    const next = !item.paid
    setItems((xs) => xs.map((x) => (x.id === item.id ? { ...x, paid: next } : x)))
    try {
      await updateLineItem(item.id, { paid: next })
      refreshGlobals()
    } catch {
      showInfo('Save failed — check your connection.')
      load(month)
    }
  }

  function handleDelete(item) {
    setItems((xs) => xs.filter((x) => x.id !== item.id))
    showUndo({
      message: 'Deleted.',
      onUndo: () => setItems((xs) => insertSorted(xs, item)),
      onCommit: async () => {
        try {
          await deleteLineItem(item.id)
          refreshGlobals()
        } catch {
          showInfo('Delete failed.')
          load(month)
        }
      },
    })
  }

  async function handleSaveItem(row) {
    const editing = Boolean(sheet?.initial?.id)
    try {
      if (editing) {
        await updateLineItem(sheet.initial.id, row)
      } else {
        const maxOrder = Math.max(0, ...items.filter((i) => i.section === row.section).map((i) => i.sort_order || 0))
        await insertLineItem({ ...row, paid: false, sort_order: maxOrder + 1 })
      }
      setSheet(null)
      await load(month)
    } catch (e) {
      showInfo(e.message || 'Save failed.')
    }
  }

  async function handleOpeningChange(value) {
    setMonthRow((r) => ({ ...(r || { month }), opening_balance: value }))
    try {
      await setOpeningBalance(month, value)
    } catch {
      showInfo('Could not save opening balance.')
    }
  }

  async function handleStartMonth() {
    setLoading(true)
    await initialiseMonth(month)
    await load(month)
    showInfo('Month started from your template.')
  }

  async function handleCopyPrev() {
    const from = prevMonth(month)
    try {
      const n = await copyMonth(from, month)
      await load(month)
      showInfo(n ? `Copied ${n} items from ${monthLabel(from)}.` : `Nothing to copy from ${monthLabel(from)}.`)
    } catch {
      showInfo('Copy failed.')
    }
  }

  return (
    <div>
      <div className="row-between" style={{ marginBottom: 14 }}>
        <div className="month-nav">
          <button className="arrow" onClick={() => setMonth(prevMonth(month))} aria-label="Previous month">
            ‹
          </button>
          <div className="month-title">
            <input
              type="month"
              value={month}
              onChange={(e) => e.target.value && setMonth(e.target.value)}
              aria-label={monthLabel(month)}
            />
          </div>
          <button className="arrow" onClick={() => setMonth(nextMonth(month))} aria-label="Next month">
            ›
          </button>
        </div>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : (
        <>
          <Dashboard
            items={items}
            opening={monthRow?.opening_balance ?? 0}
            onOpeningChange={handleOpeningChange}
            globals={globals}
          />

          <div className="btn-row" style={{ marginBottom: 14 }}>
            {!initialised && (
              <button className="btn btn-primary btn-sm" onClick={handleStartMonth}>
                {isFuture ? 'Start this month early' : 'Start new month'}
              </button>
            )}
            <button className="btn btn-sm" onClick={handleCopyPrev}>
              Copy from {monthLabel(prevMonth(month))}
            </button>
            <button className="btn btn-sm" onClick={() => setSheet({ initial: null, defaultSection: 'One-offs' })}>
              + Add section
            </button>
          </div>

          {sections.length === 0 && (
            <div className="card empty">
              {isFuture
                ? 'This future month is empty. Add a scheduled once-off, or start it early.'
                : 'No items yet. Add one to get going.'}
            </div>
          )}

          {sections.map((s) => (
            <SectionBlock
              key={s}
              section={s}
              items={grouped[s]}
              onAdd={(sec) => setSheet({ initial: null, defaultSection: sec })}
              onChangeAmount={handleChangeAmount}
              onTogglePaid={handleTogglePaid}
              onEdit={(item) => setSheet({ initial: item })}
              onDelete={handleDelete}
            />
          ))}
        </>
      )}

      {sheet && (
        <ItemSheet
          month={month}
          initial={sheet.initial}
          defaultSection={sheet.defaultSection}
          sections={sections}
          loans={globals?.loans || []}
          pots={globals?.pots || []}
          labelSuggestions={labels}
          onSave={handleSaveItem}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  )
}

// Re-insert an undo-restored item keeping section grouping stable.
function insertSorted(list, item) {
  return [...list, item]
}
