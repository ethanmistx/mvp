import { useState } from 'react'
import { useProfile } from './hooks/useStore'
import { Onboarding } from './pages/Onboarding'
import { TodayPage } from './pages/TodayPage'
import { HistoryPage } from './pages/HistoryPage'
import { GrowthPage } from './pages/GrowthPage'
import { SettingsPage } from './pages/SettingsPage'
import { TabBar, type Tab } from './components/TabBar'

export default function App() {
  const { profile, saveProfile } = useProfile()
  const [tab, setTab] = useState<Tab>('today')

  if (profile === undefined) {
    return <div className="min-h-screen flex items-center justify-center text-night-dim">…</div>
  }
  if (profile === null) {
    return <Onboarding onSave={(p) => void saveProfile(p)} />
  }

  return (
    <div className="max-w-md mx-auto min-h-screen">
      {tab === 'today' && <TodayPage profile={profile} />}
      {tab === 'history' && <HistoryPage />}
      {tab === 'growth' && <GrowthPage profile={profile} />}
      {tab === 'settings' && <SettingsPage profile={profile} />}
      <TabBar active={tab} onChange={setTab} />
    </div>
  )
}
