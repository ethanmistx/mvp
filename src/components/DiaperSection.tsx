import { useMemo, useState } from 'react'
import type { Diaper, DiaperKind } from '../types'
import { useCollection, useNow } from '../hooks/useStore'
import { diaperStatsForDay } from '../lib/stats'
import { diaperKindIcons, diaperKindLabels } from '../lib/labels'
import { newId } from '../lib/id'

export function DiaperSection() {
  const { items, put } = useCollection<Diaper>('diapers')
  const now = useNow()
  const [justSaved, setJustSaved] = useState<DiaperKind | null>(null)

  const stats = useMemo(() => diaperStatsForDay(items ?? [], now), [items, now])

  // 一键记录:单次点击立即落库(核心操作 1 次点击)
  const record = (kind: DiaperKind) => {
    void put({ id: newId(), ts: new Date().toISOString(), kind })
    setJustSaved(kind)
    setTimeout(() => setJustSaved(null), 1200)
  }

  return (
    <section className="card">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="font-semibold">换尿布</h2>
        <span className="text-sm text-night-dim">
          今日 {stats.total} 次(💧{stats.wet} 💩{stats.dirty} 混{stats.mixed})
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(diaperKindLabels) as DiaperKind[]).map((k) => (
          <button
            key={k}
            className={`btn-big py-4 flex flex-col items-center gap-1 ${
              justSaved === k ? 'bg-emerald-900 text-emerald-200' : 'bg-night-line'
            }`}
            onClick={() => record(k)}
          >
            <span className="text-2xl">{diaperKindIcons[k]}</span>
            <span className="text-xs">{justSaved === k ? '已记录 ✓' : diaperKindLabels[k]}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
