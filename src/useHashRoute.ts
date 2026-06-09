import { useEffect, useState } from 'react'

/** Returns the current hash route (without the leading '#'), updating on change. */
export function useHashRoute(): string {
  const [hash, setHash] = useState(() => window.location.hash.slice(1) || '/')
  useEffect(() => {
    const onChange = () => setHash(window.location.hash.slice(1) || '/')
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return hash
}

/** Navigate to a hash route. */
export function navigate(route: string): void {
  window.location.hash = route
}
