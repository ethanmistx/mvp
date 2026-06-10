import { Suspense, lazy, useState } from 'react'
import { useProfile } from './hooks/useStore'
import { Onboarding } from './pages/Onboarding'
import { TodayPage } from './pages/TodayPage'
import { HistoryPage } from './pages/HistoryPage'
import { SettingsPage } from './pages/SettingsPage'

// recharts 体积大,生长页按需加载;SW 预缓存后离线同样可用
const GrowthPage = lazy(() =>
  import('./pages/GrowthPage').then((m) => ({ default: m.GrowthPage })),
)
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
      {tab === 'growth' && (
        <Suspense fallback={<div className="p-6 text-night-dim">加载中…</div>}>
          <GrowthPage profile={profile} />
        </Suspense>
      )}
      {tab === 'settings' && <SettingsPage profile={profile} />}
      <TabBar active={tab} onChange={setTab} />
    </div>
  )
}
