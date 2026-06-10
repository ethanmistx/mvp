// 四类记录的新建/编辑底部弹层。新建与编辑共用,保证字段一致。
import { useEffect, useState } from 'react'
import type { Diaper, DiaperKind, Feed, FeedType, Growth, Sleep } from '../types'
import { fromDatetimeLocal, toDatetimeLocal } from '../lib/dates'
import { diaperKindLabels, feedTypeLabels } from '../lib/labels'
import { Field, Segmented, Sheet, Stepper, inputCls } from './ui'

const AMOUNT_PRESETS = [60, 90, 120, 150]

export function FeedSheet({
  open,
  initial,
  onSave,
  onClose,
}: {
  open: boolean
  /** 编辑时传入已有记录;新建时传入带默认值的草稿 */
  initial: Feed
  onSave: (feed: Feed) => void
  onClose: () => void
}) {
  const [type, setType] = useState<FeedType>(initial.type)
  const [amountMl, setAmountMl] = useState(initial.amountMl ?? 120)
  const [minutes, setMinutes] = useState(initial.minutes ?? 15)
  const [ts, setTs] = useState(toDatetimeLocal(initial.ts))
  const [note, setNote] = useState(initial.note ?? '')

  // 弹层重新打开时同步初始值
  useEffect(() => {
    if (open) {
      setType(initial.type)
      setAmountMl(initial.amountMl ?? 120)
      setMinutes(initial.minutes ?? 15)
      setTs(toDatetimeLocal(initial.ts))
      setNote(initial.note ?? '')
    }
  }, [open, initial])

  const needsAmount = type === 'bottleBreast' || type === 'formula'
  const needsMinutes = type === 'nurse'

  const save = () => {
    onSave({
      id: initial.id,
      ts: fromDatetimeLocal(ts),
      type,
      amountMl: needsAmount ? amountMl : undefined,
      minutes: needsMinutes ? minutes : undefined,
      note: note.trim() || undefined,
    })
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="喂养记录">
      <Field label="类型">
        <Segmented
          options={(Object.keys(feedTypeLabels) as FeedType[]).map((t) => ({
            value: t,
            label: feedTypeLabels[t],
          }))}
          value={type}
          onChange={setType}
        />
      </Field>
      {needsAmount && (
        <Field label="奶量">
          <Stepper value={amountMl} onChange={setAmountMl} step={10} unit="ml" presets={AMOUNT_PRESETS} />
        </Field>
      )}
      {needsMinutes && (
        <Field label="时长">
          <Stepper value={minutes} onChange={setMinutes} step={5} min={1} unit="分钟" presets={[10, 15, 20, 30]} />
        </Field>
      )}
      <Field label="时间(默认现在)">
        <input type="datetime-local" className={inputCls} value={ts} onChange={(e) => setTs(e.target.value)} />
      </Field>
      <Field label="备注(可选)">
        <input type="text" className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="如:吐奶一点" />
      </Field>
      <button className="btn-big w-full py-4 bg-warm text-night-bg text-lg" onClick={save}>
        保存
      </button>
    </Sheet>
  )
}

export function SleepSheet({
  open,
  initial,
  onSave,
  onClose,
}: {
  open: boolean
  initial: Sleep
  onSave: (sleep: Sleep) => void
  onClose: () => void
}) {
  const [start, setStart] = useState(toDatetimeLocal(initial.start))
  const [end, setEnd] = useState(initial.end ? toDatetimeLocal(initial.end) : '')
  const [ongoing, setOngoing] = useState(initial.end === null)

  useEffect(() => {
    if (open) {
      setStart(toDatetimeLocal(initial.start))
      setEnd(initial.end ? toDatetimeLocal(initial.end) : toDatetimeLocal(new Date().toISOString()))
      setOngoing(initial.end === null)
    }
  }, [open, initial])

  const save = () => {
    const startIso = fromDatetimeLocal(start)
    const endIso = ongoing ? null : fromDatetimeLocal(end)
    if (endIso !== null && endIso <= startIso) return // 结束须晚于开始
    onSave({ id: initial.id, start: startIso, end: endIso })
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="睡眠记录">
      <Field label="入睡时间">
        <input type="datetime-local" className={inputCls} value={start} onChange={(e) => setStart(e.target.value)} />
      </Field>
      <Field label="状态">
        <Segmented
          options={[
            { value: 'done', label: '已醒来' },
            { value: 'ongoing', label: '还在睡' },
          ]}
          value={ongoing ? 'ongoing' : 'done'}
          onChange={(v) => setOngoing(v === 'ongoing')}
        />
      </Field>
      {!ongoing && (
        <Field label="醒来时间">
          <input type="datetime-local" className={inputCls} value={end} onChange={(e) => setEnd(e.target.value)} />
        </Field>
      )}
      <button className="btn-big w-full py-4 bg-warm text-night-bg text-lg" onClick={save}>
        保存
      </button>
    </Sheet>
  )
}

export function DiaperSheet({
  open,
  initial,
  onSave,
  onClose,
}: {
  open: boolean
  initial: Diaper
  onSave: (diaper: Diaper) => void
  onClose: () => void
}) {
  const [kind, setKind] = useState<DiaperKind>(initial.kind)
  const [ts, setTs] = useState(toDatetimeLocal(initial.ts))
  const [note, setNote] = useState(initial.note ?? '')

  useEffect(() => {
    if (open) {
      setKind(initial.kind)
      setTs(toDatetimeLocal(initial.ts))
      setNote(initial.note ?? '')
    }
  }, [open, initial])

  const save = () => {
    onSave({ id: initial.id, ts: fromDatetimeLocal(ts), kind, note: note.trim() || undefined })
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="换尿布记录">
      <Field label="类型">
        <Segmented
          options={(Object.keys(diaperKindLabels) as DiaperKind[]).map((k) => ({
            value: k,
            label: diaperKindLabels[k],
          }))}
          value={kind}
          onChange={setKind}
        />
      </Field>
      <Field label="时间">
        <input type="datetime-local" className={inputCls} value={ts} onChange={(e) => setTs(e.target.value)} />
      </Field>
      <Field label="备注(可选)">
        <input type="text" className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <button className="btn-big w-full py-4 bg-warm text-night-bg text-lg" onClick={save}>
        保存
      </button>
    </Sheet>
  )
}

export function GrowthSheet({
  open,
  initial,
  onSave,
  onClose,
}: {
  open: boolean
  initial: Growth
  onSave: (growth: Growth) => void
  onClose: () => void
}) {
  const [date, setDate] = useState(initial.date)
  const [weightKg, setWeightKg] = useState(initial.weightKg?.toString() ?? '')
  const [lengthCm, setLengthCm] = useState(initial.lengthCm?.toString() ?? '')
  const [headCm, setHeadCm] = useState(initial.headCm?.toString() ?? '')

  useEffect(() => {
    if (open) {
      setDate(initial.date)
      setWeightKg(initial.weightKg?.toString() ?? '')
      setLengthCm(initial.lengthCm?.toString() ?? '')
      setHeadCm(initial.headCm?.toString() ?? '')
    }
  }, [open, initial])

  const parse = (s: string): number | undefined => {
    const n = Number(s)
    return s.trim() !== '' && Number.isFinite(n) && n > 0 ? n : undefined
  }

  const save = () => {
    const g: Growth = {
      id: initial.id,
      date,
      weightKg: parse(weightKg),
      lengthCm: parse(lengthCm),
      headCm: parse(headCm),
    }
    if (g.weightKg == null && g.lengthCm == null && g.headCm == null) return // 至少填一项
    onSave(g)
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="生长测量">
      <Field label="测量日期">
        <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <Field label="体重 kg">
        <input type="number" inputMode="decimal" step="0.01" className={inputCls} value={weightKg} onChange={(e) => setWeightKg(e.target.value)} placeholder="如 7.25" />
      </Field>
      <Field label="身长 cm">
        <input type="number" inputMode="decimal" step="0.1" className={inputCls} value={lengthCm} onChange={(e) => setLengthCm(e.target.value)} placeholder="如 68.5" />
      </Field>
      <Field label="头围 cm">
        <input type="number" inputMode="decimal" step="0.1" className={inputCls} value={headCm} onChange={(e) => setHeadCm(e.target.value)} placeholder="如 43.0" />
      </Field>
      <button className="btn-big w-full py-4 bg-warm text-night-bg text-lg" onClick={save}>
        保存
      </button>
    </Sheet>
  )
}
