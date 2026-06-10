export type Tab = 'today' | 'history' | 'growth' | 'settings'

const tabs: Array<{ id: Tab; icon: string; label: string }> = [
  { id: 'today', icon: '🏠', label: '今日' },
  { id: 'history', icon: '📋', label: '记录' },
  { id: 'growth', icon: '📈', label: '生长' },
  { id: 'settings', icon: '⚙️', label: '设置' },
]

export function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-night-card border-t border-night-line pb-[env(safe-area-inset-bottom)]">
      <div className="flex max-w-md mx-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`flex-1 min-h-[56px] flex flex-col items-center justify-center gap-0.5 ${
              active === t.id ? 'text-warm' : 'text-night-dim'
            }`}
            onClick={() => onChange(t.id)}
          >
            <span className="text-xl leading-none">{t.icon}</span>
            <span className="text-[11px]">{t.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
