export type Tab = 'today' | 'history' | 'growth' | 'settings'

const tabs: Array<{ id: Tab; icon: string; label: string }> = [
  { id: 'today', icon: '🏠', label: '今日' },
  { id: 'history', icon: '📋', label: '记录' },
  { id: 'growth', icon: '📈', label: '生长' },
  { id: 'settings', icon: '⚙️', label: '设置' },
]

export function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="fixed bottom-0 inset-x-0 glass border-t border-night-line/60 pb-[env(safe-area-inset-bottom)]">
      <div className="flex max-w-md mx-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`relative flex-1 min-h-[56px] flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-[color,transform] select-none ${
              active === t.id ? 'text-warm' : 'text-night-dim'
            }`}
            aria-current={active === t.id ? 'page' : undefined}
            onClick={() => onChange(t.id)}
          >
            {/* 当前页指示条 */}
            <span
              className={`absolute top-0 h-0.5 w-8 rounded-full transition-colors ${
                active === t.id ? 'bg-warm' : 'bg-transparent'
              }`}
            />
            <span className="text-xl leading-none">{t.icon}</span>
            <span className="text-[11px]">{t.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
