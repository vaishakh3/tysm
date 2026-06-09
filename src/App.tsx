import { useHashRoute } from './useHashRoute'
import { Landing } from './components/Landing'
import { CreatePage } from './components/CreatePage'
import { TipPage } from './components/TipPage'
import { decodeProfile } from './lib'

export default function App() {
  const route = useHashRoute()

  if (route.startsWith('/t/')) {
    const token = route.slice('/t/'.length)
    const profile = decodeProfile(token)
    return <TipPage profile={profile} />
  }

  if (route.startsWith('/create')) {
    return <CreatePage />
  }

  return <Landing />
}
