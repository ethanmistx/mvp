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
import { Toaster } from './components/toast'

export default function App() {
  const { profile, saveProfile } = useProfile()
  const [tab, setTab] = useState<Tab>('today')

  if (profile === undefined) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-2 text-night-dim">
        <span className="text-3xl">🌙</span>
        <span className="text-sm">正在打开…</span>
      </div>
    )
  }
  if (profile === null) {
    return <Onboarding onSave={(p) => void saveProfile(p)} />
  }

  return (
    <div className="max-w-md mx-auto min-h-screen">
      {tab === 'today' && <TodayPage profile={profile} />}
      {tab === 'history' && <HistoryPage />}
      {tab === 'growth' && (
        <Suspense
          fallback={
            <div className="p-6 flex items-center gap-2 text-night-dim text-sm">
              <span className="spinner" />
              加载图表…
            </div>
          }
        >
          <GrowthPage profile={profile} />
        </Suspense>
      )}
      {tab === 'settings' && <SettingsPage profile={profile} />}
      <TabBar active={tab} onChange={setTab} />
      <Toaster />
    </div>
  )
}
