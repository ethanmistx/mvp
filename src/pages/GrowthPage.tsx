// 生长曲线:WHO P3/P50/P97 参考线 + 宝宝散点连线,x 轴为月龄。
// 红线:页面固定显示免责声明,不做任何医疗判断。
import { useMemo, useState } from 'react'
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { BabyProfile, Growth } from '../types'
import { useCollection } from '../hooks/useStore'
import { ageInMonths, localDateStr } from '../lib/dates'
import { GROWTH_DISCLAIMER } from '../lib/labels'
import {
  describeMeasurement,
  metricUnit,
  whoCurve,
  whoPercentilesAt,
  type Metric,
} from '../lib/who'
import { newId } from '../lib/id'
import { ConfirmDialog, Segmented } from '../components/ui'
import { GrowthSheet } from '../components/editSheets'

const metricOptions: Array<{ value: Metric; label: string }> = [
  { value: 'weightKg', label: '体重' },
  { value: 'lengthCm', label: '身长' },
  { value: 'headCm', label: '头围' },
]

export function GrowthPage({ profile }: { profile: BabyProfile }) {
  const { items, put, remove } = useCollection<Growth>('growths')
  const [metric, setMetric] = useState<Metric>('weightKg')
  const [editing, setEditing] = useState<Growth | null>(null)
  const [deleting, setDeleting] = useState<Growth | null>(null)

  const sorted = useMemo(
    () => [...(items ?? [])].sort((a, b) => a.date.localeCompare(b.date)),
    [items],
  )

  // 图表数据:WHO 参考线(每 0.5 月)+ 宝宝实测点,合并到同一数组,recharts 按 month 对齐
  const chartData = useMemo(() => {
    const ref = whoCurve(profile.sex, metric).map((p) => ({ ...p, baby: undefined as number | undefined }))
    const babyPoints = sorted
      .map((g) => ({ month: ageInMonths(profile.birthDate, g.date), baby: g[metric] }))
      .filter((p) => p.baby != null && p.month >= 0 && p.month <= 24)
    return [...ref, ...babyPoints].sort((a, b) => a.month - b.month)
  }, [profile, metric, sorted])

  // 最近一次包含当前指标的测量 → 区间文字说明
  const latestText = useMemo(() => {
    const latest = [...sorted].reverse().find((g) => g[metric] != null)
    if (!latest) return null
    const age = ageInMonths(profile.birthDate, latest.date)
    return {
      date: latest.date,
      text: describeMeasurement(profile.sex, metric, latest[metric]!, age),
    }
  }, [sorted, metric, profile])

  const hasRefAtCurrentAge =
    whoPercentilesAt(profile.sex, metric, ageInMonths(profile.birthDate, localDateStr(new Date()))) !== null

  return (
    <div className="p-4 pb-24 space-y-3">
      <h1 className="text-xl font-bold px-1 pt-2">生长曲线</h1>

      <Segmented options={metricOptions} value={metric} onChange={setMetric} />

      <div className="card" style={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid stroke="#44403c" strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              type="number"
              domain={[0, 24]}
              ticks={[0, 3, 6, 9, 12, 15, 18, 21, 24]}
              tick={{ fill: '#a8a29e', fontSize: 11 }}
              label={{ value: '月龄', position: 'insideBottomRight', fill: '#a8a29e', fontSize: 11, dy: -4 }}
            />
            <YAxis domain={['auto', 'auto']} tick={{ fill: '#a8a29e', fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: '#292524', border: '1px solid #44403c', borderRadius: 12 }}
              labelFormatter={(m) => `${Number(m).toFixed(1)} 月龄`}
              formatter={(value, name) => [
                `${Number(value).toFixed(1)} ${metricUnit(metric)}`,
                name === 'baby' ? profile.name : String(name).toUpperCase(),
              ]}
            />
            <Line type="monotone" dataKey="p97" stroke="#78716c" strokeDasharray="4 4" dot={false} connectNulls />
            <Line type="monotone" dataKey="p50" stroke="#a8a29e" dot={false} connectNulls />
            <Line type="monotone" dataKey="p3" stroke="#78716c" strokeDasharray="4 4" dot={false} connectNulls />
            <Line
              type="monotone"
              dataKey="baby"
              stroke="#fbbf24"
              strokeWidth={2}
              connectNulls
              dot={{ r: 4, fill: '#fbbf24' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-night-dim px-1">
        虚线为 P3/P97,实线为 P50({profile.sex === 'boy' ? '男童' : '女童'}标准);金色为{profile.name}的记录
      </p>

      {latestText && (
        <div className="card text-sm leading-relaxed">
          <p className="text-night-dim text-xs mb-1">最近一次测量({latestText.date})</p>
          {latestText.text}
        </div>
      )}
      {!hasRefAtCurrentAge && (
        <p className="text-xs text-night-dim px-1">当前月龄已超出 0–24 月参考表,图表仅显示历史记录。</p>
      )}

      <button
        className="btn-big w-full py-4 bg-warm text-night-bg text-lg"
        onClick={() => setEditing({ id: newId(), date: localDateStr(new Date()) })}
      >
        ＋ 添加测量
      </button>

      {sorted.length > 0 && (
        <div className="card divide-y divide-night-line p-0">
          {[...sorted].reverse().map((g) => (
            <div key={g.id} className="flex items-center gap-2 px-4 py-2.5">
              <button className="flex-1 min-h-[44px] text-left text-sm" onClick={() => setEditing(g)}>
                <span className="text-night-dim mr-2">{g.date}</span>
                {g.weightKg != null && <span className="mr-2">{g.weightKg} kg</span>}
                {g.lengthCm != null && <span className="mr-2">{g.lengthCm} cm</span>}
                {g.headCm != null && <span>头围 {g.headCm} cm</span>}
              </button>
              <button
                className="min-h-[44px] min-w-[44px] text-night-dim"
                aria-label="删除"
                onClick={() => setDeleting(g)}
              >
                🗑
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 红线:固定免责声明 */}
      <p className="text-xs text-night-dim text-center px-4 pt-1">{GROWTH_DISCLAIMER}</p>

      {editing && (
        <GrowthSheet open initial={editing} onSave={(g) => void put(g)} onClose={() => setEditing(null)} />
      )}
      <ConfirmDialog
        open={deleting !== null}
        title="删除这条测量?"
        message="删除后无法恢复。"
        onConfirm={() => {
          if (deleting) void remove(deleting.id)
          setDeleting(null)
        }}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}
