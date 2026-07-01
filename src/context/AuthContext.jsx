import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { SYNTHETIC_EMAIL } from '../lib/constants'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  // One entry point for both first-ever login (creates the account) and every
  // login after (signs in). Username is fixed; only the password varies.
  async function login(password) {
    // 1. Try to sign in as an existing user.
    const signIn = await supabase.auth.signInWithPassword({
      email: SYNTHETIC_EMAIL,
      password,
    })
    if (!signIn.error) {
      await ensureSeeded()
      return { ok: true }
    }

    // 2. Sign-in failed. Either this is the first-ever login, or the password
    //    is wrong. Attempt to create the account.
    const signUp = await supabase.auth.signUp({
      email: SYNTHETIC_EMAIL,
      password,
    })

    if (signUp.data?.session) {
      // Brand new account created and signed in — seed my defaults.
      await ensureSeeded()
      return { ok: true, created: true }
    }

    // 3. Sign-up did not produce a session. Figure out why.
    const msg = (signUp.error?.message || '').toLowerCase()
    if (msg.includes('already') || msg.includes('registered')) {
      return { ok: false, error: 'Wrong password. Try again.' }
    }
    if (signUp.data?.user && !signUp.data?.session) {
      return {
        ok: false,
        error:
          'Account created but not signed in. Turn OFF "Confirm email" in ' +
          'Supabase Auth settings, then try again.',
      }
    }
    return {
      ok: false,
      error: signUp.error?.message || signIn.error?.message || 'Could not sign in.',
    }
  }

  async function logout() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// Idempotent server-side seed. Safe to call on every login — the SQL function
// returns early if templates already exist for this user.
async function ensureSeeded() {
  const { error } = await supabase.rpc('seed_defaults')
  if (error) {
    // eslint-disable-next-line no-console
    console.warn('seed_defaults failed (run supabase/schema.sql?):', error.message)
  }
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
