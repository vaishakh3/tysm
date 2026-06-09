import { useEffect, useState } from 'react'
import { navigate } from '../router'
import { getMyCreator } from '../db'
import { signOut, useAuth } from '../auth'

/**
 * Header-right controls. Signed-in creators get a quick "My page" link to their
 * live tip page (or to /create if they haven't claimed one yet) plus sign-out.
 * Signed-out visitors get the optional `signedOut` fallback.
 */
export function AccountNav({ signedOut = null }: { signedOut?: React.ReactNode }) {
  const { user, loading } = useAuth()
  const [slug, setSlug] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    let active = true
    getMyCreator(user.id).then((c) => {
      if (active) setSlug(c?.slug ?? null)
    })
    return () => {
      active = false
    }
  }, [user])

  if (loading) return null
  if (!user) return <>{signedOut}</>

  return (
    <div className="account">
      <button className="btn btn-ghost btn-sm" onClick={() => navigate(slug ? `/${slug}` : '/create')}>
        {slug ? 'My page' : 'Set up page'} →
      </button>
      <button className="btn btn-ghost btn-sm" onClick={() => signOut()}>
        Sign out
      </button>
    </div>
  )
}
