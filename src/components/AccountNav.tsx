import { signInWithGoogle, signOut, useAuth } from '../auth'

export function AccountNav() {
  const { user, loading } = useAuth()

  if (loading) return null

  if (!user) {
    return (
      <button className="btn btn-ghost btn-sm" onClick={() => signInWithGoogle('/')}>
        Admin sign in
      </button>
    )
  }

  return (
    <div className="account">
      <span className="account-email">{user.email}</span>
      <button className="btn btn-ghost btn-sm" onClick={() => signOut()}>
        Sign out
      </button>
    </div>
  )
}
