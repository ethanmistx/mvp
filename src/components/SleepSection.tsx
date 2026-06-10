import { useMemo, useState } from 'react'
import type { Sleep } from '../types'
import { useCollection, useNow } from '../hooks/useStore'
import { sleepStatsForDay } from '../lib/stats'
import { formatMinutes, formatTime, sleepMinutes } from '../lib/dates'
import { newId } from '../lib/id'
import { SleepSheet } from './editSheets'

export function SleepSection() {
  const { items, put } = useCollection<Sleep>('sleeps')
  // 进行中要实时计时,1 秒跳动;无进行中时 30 秒足够
  const hasOngoing = (items ?? []).some((s) => s.end === null)
  const now = useNow(hasOngoing ? 1000 : 30_000)
  const [manualDraft, setManualDraft] = useState<Sleep | null>(null)

  const stats = useMemo(() => sleepStatsForDay(items ?? [], now), [items, now])
  const ongoing = stats.ongoing

  const toggle = () => {
    if (ongoing) {
      void put({ ...ongoing, end: new Date().toISOString() })
    } else {
      void put({ id: newId(), start: new Date().toISOString(), end: null })
    }
  }

  const ongoingMin = ongoing ? sleepMinutes(ongoing.start, null, now) : 0

  return (
    <section className="card">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="font-semibold">睡眠</h2>
        <span className="text-sm text-night-dim">
          今日 {formatMinutes(stats.totalMinutes)} · {stats.segments} 段
          {stats.longestMinutes > 0 && ` · 最长 ${formatMinutes(stats.longestMinutes)}`}
        </span>
      </div>
      <button
        className={`btn-big w-full py-6 text-lg ${
          ongoing
            ? 'bg-indigo-900 text-indigo-100 ring-2 ring-indigo-400 animate-pulse'
            : 'bg-night-line'
        }`}
        onClick={toggle}
      >
        {ongoing ? (
          <span>
            😴 睡眠中 {formatMinutes(ongoingMin)}
            <span className="block text-sm mt-1 text-indigo-300">
              {formatTime(ongoing.start)} 入睡 · 点按结束
            </span>
          </span>
        ) : (
          <span>🌙 开始睡眠</span>
        )}
      </button>
      <button
        className="btn-big w-full py-2.5 mt-2 text-sm text-night-dim bg-transparent border border-night-line"
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
          open={manualDraft !== null}
          initial={manualDraft}
          onSave={(s) => void put(s)}
          onClose={() => setManualDraft(null)}
        />
      )}
    </section>
  )
}
