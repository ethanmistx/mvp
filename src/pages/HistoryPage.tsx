// 记录页:全部记录按日分组,点条目编辑,删除需二次确认。
import { useMemo, useState } from 'react'
import type { Diaper, Feed, Growth, MedCourse, MedDose, Sleep, Temperature } from '../types'
import { useCollection, useNow } from '../hooks/useStore'
import { formatMinutes, formatTime, localDateStr, parseLocalDate, sleepMinutes } from '../lib/dates'
import { diaperKindIcons, diaperKindLabels, feedTypeLabels, tempSiteLabels } from '../lib/labels'
import { ConfirmDialog, EmptyState } from '../components/ui'
import { DiaperSheet, DoseSheet, FeedSheet, GrowthSheet, SleepSheet, TempSheet } from '../components/editSheets'
import { pageMemory } from '../lib/pageMemory'

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

function dayHeading(day: string, todayStr: string): string {
  const weekday = WEEKDAYS[parseLocalDate(day).getDay()]
  return day === todayStr ? `今天 · ${day}` : `${day} ${weekday}`
}

type Entry =
  | { kind: 'feed'; ts: string; record: Feed }
  | { kind: 'sleep'; ts: string; record: Sleep }
  | { kind: 'diaper'; ts: string; record: Diaper }
  | { kind: 'growth'; ts: string; record: Growth }
  | { kind: 'temp'; ts: string; record: Temperature }
  | { kind: 'dose'; ts: string; record: MedDose; courseName: string }

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
      return {
        icon: diaperKindIcons[d.kind],
        text: `尿布 · ${diaperKindLabels[d.kind]}${d.note ? ` · ${d.note}` : ''}`,
      }
    }
    case 'growth': {
      const g = e.record
      const parts = []
      if (g.weightKg != null) parts.push(`体重 ${g.weightKg} kg`)
      if (g.lengthCm != null) parts.push(`身长 ${g.lengthCm} cm`)
      if (g.headCm != null) parts.push(`头围 ${g.headCm} cm`)
      return { icon: '📏', text: parts.join(' · ') }
    }
    case 'temp': {
      const t = e.record
      const site = t.site ? ` · ${tempSiteLabels[t.site]}` : ''
      const anti = t.antipyretic ? ' · 用了退烧药' : ''
      return { icon: '🌡️', text: `体温 ${t.celsius.toFixed(1)} °C${site}${anti}${t.note ? ` · ${t.note}` : ''}` }
    }
    case 'dose':
      return { icon: '💊', text: `服药 · ${e.courseName}` }
  }
}

export function HistoryPage() {
  const now = useNow()
  const feeds = useCollection<Feed>('feeds')
  const sleeps = useCollection<Sleep>('sleeps')
  const diapers = useCollection<Diaper>('diapers')
  const growths = useCollection<Growth>('growths')
  const temps = useCollection<Temperature>('temperatures')
  const courses = useCollection<MedCourse>('medCourses')
  const doses = useCollection<MedDose>('medDoses')

  const [editing, setEditing] = useState<Entry | null>(null)
  const [deleting, setDeleting] = useState<Entry | null>(null)
  // 按天分页:一年后全量渲染几千条会卡顿,默认只渲染最近 14 个记录日
  // (切 tab 卸载后通过 pageMemory 记住浏览深度)
  const [daysShown, setDaysShown] = useState(pageMemory.historyDaysShown)
  const showMore = () => {
    setDaysShown((n) => {
      pageMemory.historyDaysShown = n + 30
      return n + 30
    })
  }

  const groups = useMemo(() => {
    const courseNames = new Map((courses.items ?? []).map((c) => [c.id, c.name]))
    const entries: Entry[] = [
      ...(feeds.items ?? []).map((r): Entry => ({ kind: 'feed', ts: r.ts, record: r })),
      ...(sleeps.items ?? []).map((r): Entry => ({ kind: 'sleep', ts: r.start, record: r })),
      ...(diapers.items ?? []).map((r): Entry => ({ kind: 'diaper', ts: r.ts, record: r })),
      ...(temps.items ?? []).map((r): Entry => ({ kind: 'temp', ts: r.ts, record: r })),
      ...(doses.items ?? []).map(
        (r): Entry => ({ kind: 'dose', ts: r.ts, record: r, courseName: courseNames.get(r.courseId) ?? '未知疗程' }),
      ),
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
  }, [feeds.items, sleeps.items, diapers.items, growths.items, temps.items, courses.items, doses.items])

  const doDelete = () => {
    if (!deleting) return
    const { kind, record } = deleting
    if (kind === 'feed') void feeds.remove(record.id)
    else if (kind === 'sleep') void sleeps.remove(record.id)
    else if (kind === 'diaper') void diapers.remove(record.id)
    else if (kind === 'temp') void temps.remove(record.id)
    else if (kind === 'dose') void doses.remove(record.id)
    else void growths.remove(record.id)
    setDeleting(null)
  }

  const todayStr = localDateStr(now)

  return (
    <div className="page">
      <h1 className="page-title mb-3">记录</h1>
      {groups.length === 0 && (
        <EmptyState icon="🌱">
          还没有任何记录
          <br />
          去「今日」页记下第一笔吧
        </EmptyState>
      )}
      {groups.slice(0, daysShown).map(([day, entries]) => (
        <div key={day} className="mb-4">
          <h2 className="text-sm text-night-dim px-1 mb-2">{dayHeading(day, todayStr)}</h2>
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
                    className="min-h-[44px] min-w-[44px] text-night-dim active:scale-90 transition-transform"
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

      {groups.length > daysShown && (
        <button className="btn-big w-full py-3 bg-night-card text-night-dim text-sm" onClick={showMore}>
          加载更早的记录(还有 {groups.length - daysShown} 天)
        </button>
      )}

      {editing?.kind === 'feed' && (
        <FeedSheet open initial={editing.record} onSave={(r) => void feeds.put(r)} onClose={() => setEditing(null)} />
      )}
      {editing?.kind === 'sleep' && (
        <SleepSheet
          open
          initial={editing.record}
          allSleeps={sleeps.items ?? []}
          onSave={(r) => void sleeps.put(r)}
          onClose={() => setEditing(null)}
        />
      )}
      {editing?.kind === 'diaper' && (
        <DiaperSheet open initial={editing.record} onSave={(r) => void diapers.put(r)} onClose={() => setEditing(null)} />
      )}
      {editing?.kind === 'growth' && (
        <GrowthSheet open initial={editing.record} onSave={(r) => void growths.put(r)} onClose={() => setEditing(null)} />
      )}
      {editing?.kind === 'temp' && (
        <TempSheet open initial={editing.record} onSave={(r) => void temps.put(r)} onClose={() => setEditing(null)} />
      )}
      {editing?.kind === 'dose' && (
        <DoseSheet
          open
          initial={editing.record}
          courseName={editing.courseName}
          onSave={(r) => void doses.put(r)}
          onClose={() => setEditing(null)}
        />
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
