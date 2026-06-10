// 记录页:全部记录按日分组,点条目编辑,删除需二次确认。
import { useMemo, useState } from 'react'
import type { Diaper, Feed, Growth, Sleep } from '../types'
import { useCollection, useNow } from '../hooks/useStore'
import { formatMinutes, formatTime, localDateStr, sleepMinutes } from '../lib/dates'
import { diaperKindLabels, feedTypeLabels } from '../lib/labels'
import { ConfirmDialog } from '../components/ui'
import { DiaperSheet, FeedSheet, GrowthSheet, SleepSheet } from '../components/editSheets'

type Entry =
  | { kind: 'feed'; ts: string; record: Feed }
  | { kind: 'sleep'; ts: string; record: Sleep }
  | { kind: 'diaper'; ts: string; record: Diaper }
  | { kind: 'growth'; ts: string; record: Growth }

function entryLabel(e: Entry, now: Date): { icon: string; text: string } {
  switch (e.kind) {
    case 'feed': {
      const f = e.record
      const detail =
        f.amountMl != null ? ` ${f.amountMl} ml` : f.minutes != null ? ` ${f.minutes} 分钟` : ''
      return { icon: '🍼', text: `${feedTypeLabels[f.type]}${detail}${f.note ? ` · ${f.note}` : ''}` }
    }
    case 'sleep': {
      const s = e.record
      const dur = formatMinutes(sleepMinutes(s.start, s.end, now))
      const range = s.end ? `${formatTime(s.start)}–${formatTime(s.end)}` : `${formatTime(s.start)} 起,进行中`
      return { icon: '🌙', text: `睡眠 ${dur}(${range})` }
    }
    case 'diaper': {
      const d = e.record
      return { icon: '💧', text: `尿布 · ${diaperKindLabels[d.kind]}${d.note ? ` · ${d.note}` : ''}` }
    }
    case 'growth': {
      const g = e.record
      const parts = []
      if (g.weightKg != null) parts.push(`体重 ${g.weightKg} kg`)
      if (g.lengthCm != null) parts.push(`身长 ${g.lengthCm} cm`)
      if (g.headCm != null) parts.push(`头围 ${g.headCm} cm`)
      return { icon: '📏', text: parts.join(' · ') }
    }
  }
}

export function HistoryPage() {
  const now = useNow()
  const feeds = useCollection<Feed>('feeds')
  const sleeps = useCollection<Sleep>('sleeps')
  const diapers = useCollection<Diaper>('diapers')
  const growths = useCollection<Growth>('growths')

  const [editing, setEditing] = useState<Entry | null>(null)
  const [deleting, setDeleting] = useState<Entry | null>(null)

  const groups = useMemo(() => {
    const entries: Entry[] = [
      ...(feeds.items ?? []).map((r): Entry => ({ kind: 'feed', ts: r.ts, record: r })),
      ...(sleeps.items ?? []).map((r): Entry => ({ kind: 'sleep', ts: r.start, record: r })),
      ...(diapers.items ?? []).map((r): Entry => ({ kind: 'diaper', ts: r.ts, record: r })),
      // 生长记录只有日期,排在当天最前
      ...(growths.items ?? []).map((r): Entry => ({ kind: 'growth', ts: `${r.date}T00:00:00`, record: r })),
    ]
    entries.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
    const byDay = new Map<string, Entry[]>()
    for (const e of entries) {
      const day = localDateStr(new Date(e.ts))
      if (!byDay.has(day)) byDay.set(day, [])
      byDay.get(day)!.push(e)
    }
    return [...byDay.entries()]
  }, [feeds.items, sleeps.items, diapers.items, growths.items])

  const doDelete = () => {
    if (!deleting) return
    const { kind, record } = deleting
    if (kind === 'feed') void feeds.remove(record.id)
    else if (kind === 'sleep') void sleeps.remove(record.id)
    else if (kind === 'diaper') void diapers.remove(record.id)
    else void growths.remove(record.id)
    setDeleting(null)
  }

  const todayStr = localDateStr(now)

  return (
    <div className="p-4 pb-24">
      <h1 className="text-xl font-bold px-1 pt-2 mb-3">记录</h1>
      {groups.length === 0 && (
        <p className="text-night-dim text-sm px-1">还没有任何记录,去「今日」页开始吧。</p>
      )}
      {groups.map(([day, entries]) => (
        <div key={day} className="mb-4">
          <h2 className="text-sm text-night-dim px-1 mb-2">
            {day === todayStr ? `今天 · ${day}` : day}
          </h2>
          <div className="card divide-y divide-night-line p-0">
            {entries.map((e) => {
              const { icon, text } = entryLabel(e, now)
              return (
                <div key={`${e.kind}-${e.record.id}`} className="flex items-center gap-3 px-4 py-3">
                  <button
                    className="flex items-center gap-3 flex-1 min-h-[44px] text-left"
                    onClick={() => setEditing(e)}
                  >
                    <span className="text-xl">{icon}</span>
                    <span className="flex-1 text-sm">{text}</span>
                    <span className="text-xs text-night-dim tabular-nums">
                      {e.kind === 'growth' ? '' : formatTime(e.ts)}
                    </span>
                  </button>
                  <button
                    className="min-h-[44px] min-w-[44px] text-night-dim"
                    aria-label="删除"
                    onClick={() => setDeleting(e)}
                  >
                    🗑
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {editing?.kind === 'feed' && (
        <FeedSheet open initial={editing.record} onSave={(r) => void feeds.put(r)} onClose={() => setEditing(null)} />
      )}
      {editing?.kind === 'sleep' && (
        <SleepSheet open initial={editing.record} onSave={(r) => void sleeps.put(r)} onClose={() => setEditing(null)} />
      )}
      {editing?.kind === 'diaper' && (
        <DiaperSheet open initial={editing.record} onSave={(r) => void diapers.put(r)} onClose={() => setEditing(null)} />
      )}
      {editing?.kind === 'growth' && (
        <GrowthSheet open initial={editing.record} onSave={(r) => void growths.put(r)} onClose={() => setEditing(null)} />
      )}
      <ConfirmDialog
        open={deleting !== null}
        title="删除这条记录?"
        message="删除后无法恢复。"
        onConfirm={doDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}
