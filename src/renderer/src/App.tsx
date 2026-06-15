import { StoreProvider, useStore } from './store'
import HomePage from './components/HomePage'
import MeetingRoom from './components/MeetingRoom'

function AppInner() {
  const { page } = useStore()

  if (page === 'meeting') {
    return <MeetingRoom />
  }

  return <HomePage />
}

export default function App() {
  return (
    <StoreProvider>
      <AppInner />
    </StoreProvider>
  )
}
