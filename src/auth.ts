import { useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from './supabase'

export interface AuthState {
  user: User | null
  loading: boolean
}

/** Subscribe to the current Supabase auth session. */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ user: null, loading: Boolean(supabase) })

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setState({ user: data.session?.user ?? null, loading: false })
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session: Session | null) => {
      setState({ user: session?.user ?? null, loading: false })
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  return state
}

/** Start the Google OAuth flow, returning to the given path afterwards. */
export async function signInWithGoogle(redirectPath = '/'): Promise<void> {
  if (!supabase) return
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}${redirectPath}` },
  })
}

export async function signOut(): Promise<void> {
  if (!supabase) return
  await supabase.auth.signOut()
}
