import { createContext, useContext, useRef, useState, useCallback } from 'react'

const ToastContext = createContext(null)
const DURATION = 5000

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null) // { id, message, onUndo }
  const timer = useRef(null)
  const commitRef = useRef(null) // the pending commit for the current toast

  const clearTimer = () => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }

  // Flush any pending commit immediately (e.g. before showing a new toast).
  const flush = useCallback(() => {
    clearTimer()
    if (commitRef.current) {
      const c = commitRef.current
      commitRef.current = null
      c()
    }
    setToast(null)
  }, [])

  // Delete-with-undo. The caller has already optimistically removed the item
  // from the UI. `onCommit` performs the real deletion after the window;
  // `onUndo` restores the UI. If a new toast arrives first, we commit at once.
  const showUndo = useCallback(
    ({ message, onUndo, onCommit }) => {
      flush() // commit whatever was pending before starting a new one
      commitRef.current = onCommit || null
      const id = Math.random().toString(36).slice(2)
      setToast({
        id,
        message,
        onUndo: () => {
          clearTimer()
          commitRef.current = null
          if (onUndo) onUndo()
          setToast(null)
        },
      })
      timer.current = setTimeout(() => {
        commitRef.current = null
        if (onCommit) onCommit()
        setToast(null)
      }, DURATION)
    },
    [flush],
  )

  // Plain informational toast, no undo.
  const showInfo = useCallback((message) => {
    clearTimer()
    const id = Math.random().toString(36).slice(2)
    setToast({ id, message, onUndo: null })
    timer.current = setTimeout(() => setToast(null), 3000)
  }, [])

  return (
    <ToastContext.Provider value={{ showUndo, showInfo, flush }}>
      {children}
      {toast && (
        <div className="toast" role="status">
          <span className="toast-msg">{toast.message}</span>
          {toast.onUndo && (
            <button className="toast-undo" onClick={toast.onUndo}>
              Undo
            </button>
          )}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
