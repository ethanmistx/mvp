import { useMemo, useRef, useState } from 'react'
import type { Sleep } from '../types'
import { storage } from '../storage'
import { useCollection, useNow } from '../hooks/useStore'
import { sleepStatsForDay } from '../lib/stats'
import { formatHms, formatMinutes, formatTime } from '../lib/dates'
import { newId } from '../lib/id'
import { SleepSheet } from './editSheets'

export function SleepSection() {
  const { items, put } = useCollection<Sleep>('sleeps')
  // 进行中要实时计时,1 秒跳动;无进行中时 30 秒足够
  const hasOngoing = (items ?? []).some((s) => s.end === null)
  const now = useNow(hasOngoing ? 1000 : 30_000)
  const [manualDraft, setManualDraft] = useState<Sleep | null>(null)
  // 防双击:写入在途时丢弃后续点击,避免连点造出两条进行中记录
  const togglingRef = useRef(false)

  const stats = useMemo(() => sleepStatsForDay(items ?? [], now), [items, now])
  const ongoing = stats.ongoing

  const toggle = async () => {
    if (togglingRef.current) return
    togglingRef.current = true
    try {
      // 点击时从存储读权威状态,而不是依赖可能滞后的 items
      const latest = await storage.list<Sleep>('sleeps')
      const current = latest.find((s) => s.end === null)
      if (current) {
        await put({ ...current, end: new Date().toISOString() })
      } else {
        await put({ id: newId(), start: new Date().toISOString(), end: null })
      }
    } finally {
      togglingRef.current = false
    }
  }

  return (
    <section className="card">
      <div className="flex items-baseline justify-between gap-2 flex-wrap mb-3">
        <h2 className="font-semibold">睡眠</h2>
        <span className="text-xs text-night-dim text-right">
          今日 {formatMinutes(stats.totalMinutes)} · {stats.segments} 段
          {stats.longestMinutes > 0 && ` · 最长 ${formatMinutes(stats.longestMinutes)}`}
        </span>
      </div>
      <button
        className={`btn-big w-full py-6 text-lg ${
          ongoing
            ? 'bg-sleep-bg text-sleep-text ring-1 ring-sleep-ring/60 animate-breathe'
            : 'bg-night-line'
        }`}
        onClick={() => void toggle()}
      >
        {ongoing ? (
          <span>
            😴 睡眠中{' '}
            <span className="tabular-nums font-semibold">{formatHms(ongoing.start, now)}</span>
            <span className="block text-sm mt-1 font-normal text-sleep-sub">
              {formatTime(ongoing.start)} 入睡 · 点按结束
            </span>
          </span>
        ) : (
          <span>🌙 开始睡眠</span>
        )}
      </button>
      <button
        className="btn-ghost w-full py-2.5 mt-2 text-sm"
        onClick={() =>
          setManualDraft({
            id: newId(),
            start: new Date(Date.now() - 60 * 60000).toISOString(),
            end: new Date().toISOString(),
          })
        }
      >
        手动补记一段
      </button>
      {manualDraft && (
        <SleepSheet
          open
          initial={manualDraft}
          allSleeps={items ?? []}
          onSave={(s) => void put(s)}
          onClose={() => setManualDraft(null)}
        />
      )}
    </section>
  )
}
