import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { FIXED_USERNAME } from '../lib/constants'
import { supabaseConfigured } from '../supabaseClient'

export default function Login() {
  const { login } = useAuth()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    if (!password) return
    setBusy(true)
    setError('')
    try {
      const res = await login(password)
      if (!res.ok) setError(res.error)
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-wrap">
      <form className="card login-card" onSubmit={onSubmit}>
        <h1>My Budget</h1>
        <p>Sign in to continue</p>

        {!supabaseConfigured && (
          <div className="form-error" style={{ textAlign: 'center' }}>
            Supabase isn’t configured yet. Add your keys to <code>.env</code> and
            restart.
          </div>
        )}

        <div className="field">
          <label>Username</label>
          <input value={FIXED_USERNAME} disabled readOnly autoComplete="username" />
        </div>

        <div className="field">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            autoFocus
          />
        </div>

        {error && <div className="form-error">{error}</div>}

        <button className="btn btn-primary" style={{ width: '100%' }} disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>

        <p style={{ marginTop: 16, fontSize: 12 }}>
          First time? Whatever password you enter becomes your password.
        </p>
      </form>
    </div>
  )
}
