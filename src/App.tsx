import { useLocation } from './router'
import { Landing } from './components/Landing'
import { CreatePage } from './components/CreatePage'
import { TipPage } from './components/TipPage'
import { SlugTipPage } from './components/SlugTipPage'
import { WallsDashboard } from './components/WallsDashboard'
import { CollectPage } from './components/CollectPage'
import { WallPage } from './components/WallPage'
import { decodeProfile, RESERVED_SLUGS } from './lib'

export default function App() {
  const { pathname, hash } = useLocation()

  // Legacy offline links: /#/t/<token> (full profile embedded in the URL).
  if (hash.startsWith('#/t/')) {
    const token = hash.slice('#/t/'.length)
    return <TipPage profile={decodeProfile(token)} />
  }

  const parts = pathname.replace(/^\/+/, '').split('/')
  const segment = parts[0]
  const sub = parts[1] || ''

  if (segment === '') return <Landing />
  if (segment === 'create') return <CreatePage />

  // Testimonial product
  if (segment === 'walls') return <WallsDashboard slug={sub || undefined} />
  if (segment === 'c') return <CollectPage slug={sub} />
  if (segment === 'w') return <WallPage slug={sub} />
  if (segment === 'embed') return <WallPage slug={sub} embed />

  if (RESERVED_SLUGS.has(segment)) return <Landing />

  return <SlugTipPage slug={segment} />
}
