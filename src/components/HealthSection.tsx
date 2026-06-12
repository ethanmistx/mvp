// 今日页「健康」区块:体温快捷记录 + 72h 迷你曲线 + 用药疗程打卡。
// 通用设计(发烧/抗生素疗程/疫苗后观察都适用),不绑定具体疾病,不做医疗判断。
import { useMemo, useState } from 'react'
import type { MedCourse, MedDose, Temperature } from '../types'
import { useCollection, useNow } from '../hooks/useStore'
import { activeCourses, courseAdherence, tempsInWindow } from '../lib/health'
import { localDateStr, timeAgo } from '../lib/dates'
import { tempSiteLabels } from '../lib/labels'
import { newId } from '../lib/id'
import { ConfirmDialog } from './ui'
import { MedCourseSheet, TempSheet } from './editSheets'
import { showToast } from './toast'

/** 72 小时体温迷你曲线:纯 SVG,38°C 中性参考虚线(不做发烧判断) */
function TempSparkline({ temps, now }: { temps: Temperature[]; now: Date }) {
  const points = tempsInWindow(temps, now, 72)
  if (points.length < 2) return null
  const W = 320
  const H = 64
  const left = 26
  const minC = 35.5
  const maxC = 40.5
  const x = (iso: string) =>
    left + ((new Date(iso).getTime() - (now.getTime() - 72 * 3600_000)) / (72 * 3600_000)) * (W - left - 6)
  const y = (c: number) => {
    const clamped = Math.min(maxC, Math.max(minC, c))
    return 6 + (1 - (clamped - minC) / (maxC - minC)) * (H - 16)
  }
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.ts).toFixed(1)} ${y(p.celsius).toFixed(1)}`).join(' ')
  const last = points[points.length - 1]
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto mt-1" aria-label="最近 72 小时体温曲线">
      <line x1={left} x2={W - 6} y1={y(38)} y2={y(38)} strokeDasharray="4 4" className="stroke-night-line" strokeWidth="1" />
      <text x={left - 4} y={y(38) + 3} textAnchor="end" fontSize="9" className="fill-night-dim">
        38°
      </text>
      <path d={path} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="stroke-warm" />
      {points.map((p) => (
        <circle key={p.id} cx={x(p.ts)} cy={y(p.celsius)} r="2.6" className="fill-warm" />
      ))}
      <text x={Math.min(x(last.ts), W - 30)} y={Math.max(10, y(last.celsius) - 7)} fontSize="10" className="fill-night-text">
        {last.celsius.toFixed(1)}
      </text>
    </svg>
  )
}

export function HealthSection() {
  const { items: temps, put: putTemp } = useCollection<Temperature>('temperatures')
  const { items: courses, put: putCourse, remove: removeCourse } = useCollection<MedCourse>('medCourses')
  const { items: doses, put: putDose, remove: removeDose } = useCollection<MedDose>('medDoses')
  const now = useNow()

  const [tempDraft, setTempDraft] = useState<Temperature | null>(null)
  const [courseDraft, setCourseDraft] = useState<MedCourse | null>(null)
  const [deletingCourse, setDeletingCourse] = useState<MedCourse | null>(null)

  const active = useMemo(() => activeCourses(courses ?? [], now), [courses, now])
  const latestTemp = useMemo(
    () => [...(temps ?? [])].sort((a, b) => b.ts.localeCompare(a.ts))[0] ?? null,
    [temps],
  )

  const newTemp = () =>
    setTempDraft({
      id: newId(),
      ts: new Date().toISOString(),
      celsius: latestTemp?.celsius ?? 36.8,
      site: latestTemp?.site ?? 'armpit',
    })

  const newCourse = () => {
    const today = localDateStr(now)
    setCourseDraft({
      id: newId(),
      name: '',
      timesPerDay: 3,
      startDate: today,
      endDate: today, // Sheet 内按天数重算
    })
  }

  const checkIn = (course: MedCourse) => {
    void putDose({ id: newId(), courseId: course.id, ts: new Date().toISOString() })
    showToast(`${course.name} 已记录 ✓`)
  }

  const doDeleteCourse = async () => {
    if (!deletingCourse) return
    // 级联删除该疗程的打卡记录
    for (const d of (doses ?? []).filter((d) => d.courseId === deletingCourse.id)) {
      await removeDose(d.id)
    }
    await removeCourse(deletingCourse.id)
    setDeletingCourse(null)
    setCourseDraft(null)
  }

  return (
    <section className="card">
      <div className="flex items-baseline justify-between gap-2 flex-wrap mb-3">
        <h2 className="font-semibold">健康</h2>
        {latestTemp && (
          <span className="text-xs text-night-dim text-right">
            最近体温 {latestTemp.celsius.toFixed(1)} °C
            {latestTemp.site ? `(${tempSiteLabels[latestTemp.site]})` : ''} · {timeAgo(latestTemp.ts, now)}
          </span>
        )}
      </div>

      <TempSparkline temps={temps ?? []} now={now} />

      {active.length > 0 && (
        <div className="mt-2 space-y-2">
          {active.map((c) => {
            const a = courseAdherence(c, doses ?? [], now)
            const done = a.todayCount >= c.timesPerDay
            return (
              <div key={c.id} className="flex items-center gap-2 rounded-xl bg-night-bg/60 px-3 py-2">
                <button className="flex-1 min-h-[44px] text-left" onClick={() => setCourseDraft(c)}>
                  <span className="text-sm">💊 {c.name}</span>
                  {c.note && <span className="text-xs text-night-dim ml-1.5">{c.note}</span>}
                  <span className="block text-xs text-night-dim mt-0.5">
                    疗程第 {a.dayOfCourse}/{a.totalDays} 天 · 今日 {a.todayCount}/{c.timesPerDay} 次
                  </span>
                </button>
                <button
                  className={`btn-big px-4 py-2.5 text-sm shrink-0 ${
                    done ? 'bg-success-bg text-success-text' : 'bg-warm text-night-bg'
                  }`}
                  onClick={() => checkIn(c)}
                >
                  {done ? '已完成 ✓' : '记一次'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      <div className="flex gap-2 mt-3">
        <button className="btn-secondary flex-1 py-3 text-sm" onClick={newTemp}>
          🌡️ 记体温
        </button>
        <button className="btn-ghost flex-1 py-3 text-sm" onClick={newCourse}>
          ＋ 用药疗程
        </button>
      </div>

      {tempDraft && (
        <TempSheet open initial={tempDraft} onSave={(t) => void putTemp(t)} onClose={() => setTempDraft(null)} />
      )}
      {courseDraft && (
        <MedCourseSheet
          open
          initial={courseDraft}
          onSave={(c) => void putCourse(c)}
          onDelete={(courses ?? []).some((c) => c.id === courseDraft.id) ? () => setDeletingCourse(courseDraft) : undefined}
          onClose={() => setCourseDraft(null)}
        />
      )}
      <ConfirmDialog
        open={deletingCourse !== null}
        title="删除该疗程?"
        message="疗程及其全部服药打卡记录都会删除,无法恢复。"
        onConfirm={() => void doDeleteCourse()}
        onCancel={() => setDeletingCourse(null)}
      />
    </section>
  )
}
