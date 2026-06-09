import { useEffect, useReducer } from 'react'

/** Re-renders on any location change (path, hash, or in-app navigation). */
export function useLocation(): { pathname: string; hash: string } {
  const [, force] = useReducer((n: number) => n + 1, 0)
  useEffect(() => {
    window.addEventListener('popstate', force)
    window.addEventListener('hashchange', force)
    window.addEventListener('tysm:navigate', force)
    return () => {
      window.removeEventListener('popstate', force)
      window.removeEventListener('hashchange', force)
      window.removeEventListener('tysm:navigate', force)
    }
  }, [])
  return { pathname: window.location.pathname, hash: window.location.hash }
}

/** Navigate within the app. Paths starting with '#' use the hash (legacy links). */
export function navigate(to: string): void {
  if (to.startsWith('#')) {
    window.location.hash = to
    return
  }
  window.history.pushState({}, '', to)
  window.dispatchEvent(new Event('tysm:navigate'))
  window.scrollTo(0, 0)
}
