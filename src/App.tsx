import { useLocation } from './router'
import { Landing } from './components/Landing'
import { CreatePage } from './components/CreatePage'
import { TipPage } from './components/TipPage'
import { SlugTipPage } from './components/SlugTipPage'
import { decodeProfile, RESERVED_SLUGS } from './lib'

export default function App() {
  const { pathname, hash } = useLocation()

  // Legacy offline links: /#/t/<token> (full profile embedded in the URL).
  if (hash.startsWith('#/t/')) {
    const token = hash.slice('#/t/'.length)
    return <TipPage profile={decodeProfile(token)} />
  }

  const segment = pathname.replace(/^\/+/, '').split('/')[0]

  if (segment === '') return <Landing />
  if (segment === 'create') return <CreatePage />
  if (RESERVED_SLUGS.has(segment)) return <Landing />

  return <SlugTipPage slug={segment} />
}
