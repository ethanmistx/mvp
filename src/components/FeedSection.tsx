import { useMemo, useState } from 'react'
import type { Feed, FeedType } from '../types'
import { useCollection, useNow } from '../hooks/useStore'
import { feedStatsForDay } from '../lib/stats'
import { timeAgo } from '../lib/dates'
import { feedTypeLabels } from '../lib/labels'
import { newId } from '../lib/id'
import { FeedSheet } from './editSheets'

const typeIcons: Record<FeedType, string> = {
  nurse: '🤱',
  bottleBreast: '🍼',
  formula: '🥛',
  solid: '🥣',
}

export function FeedSection() {
  const { items, put } = useCollection<Feed>('feeds')
  const now = useNow()
  const [draft, setDraft] = useState<Feed | null>(null)

  const stats = useMemo(() => feedStatsForDay(items ?? [], now), [items, now])

  // 新建草稿:类型默认上次同类记录的量,时间默认现在(≤2 次点击:点类型 → 点保存)
  const openNew = (type: FeedType) => {
    const lastSame = (items ?? [])
      .filter((f) => f.type === type)
      .sort((a, b) => b.ts.localeCompare(a.ts))[0]
    setDraft({
      id: newId(),
      ts: new Date().toISOString(),
      type,
      amountMl: lastSame?.amountMl ?? 120,
      minutes: lastSame?.minutes ?? 15,
    })
  }

  return (
    <section className="card">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="font-semibold">喂养</h2>
        <span className="text-sm text-night-dim">
          今日 {stats.count} 次
          {stats.totalMl > 0 && ` · ${stats.totalMl} ml`}
          {stats.nurseMinutes > 0 && ` · 亲喂 ${stats.nurseMinutes} 分`}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {(Object.keys(feedTypeLabels) as FeedType[]).map((t) => (
          <button
            key={t}
            className="btn-big py-3 bg-night-line flex flex-col items-center gap-1"
            onClick={() => openNew(t)}
          >
            <span className="text-2xl">{typeIcons[t]}</span>
            <span className="text-xs">{feedTypeLabels[t]}</span>
          </button>
        ))}
      </div>
      <p className="text-sm text-night-dim mt-3">
        {stats.lastTs ? `上次喂养:${timeAgo(stats.lastTs, now)}` : '今天还没有喂养记录'}
      </p>
      {draft && (
        <FeedSheet
          open={draft !== null}
          initial={draft}
          onSave={(f) => void put(f)}
          onClose={() => setDraft(null)}
        />
      )}
    </section>
  )
}
