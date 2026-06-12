// 四类记录的新建/编辑底部弹层。新建与编辑共用,保证字段一致。
// 约定:调用方只在打开时才挂载这些组件(条件渲染),状态由 initial 在挂载时初始化,
// 关闭即卸载,无需手动重置。
// 校验失败一律给出可见的错误文案,绝不静默 return;用户一旦修改输入即清除错误。
import { useState } from 'react'
import type {
  Diaper,
  DiaperKind,
  Feed,
  FeedType,
  Growth,
  MedCourse,
  MedDose,
  Sleep,
  Temperature,
  TempSite,
} from '../types'
import { fromDatetimeLocal, localDateStr, parseLocalDate, toDatetimeLocal } from '../lib/dates'
import { findConflictingOngoing } from '../lib/stats'
import { diaperKindLabels, feedTypeLabels, tempSiteLabels } from '../lib/labels'
import { Field, Segmented, Sheet, Stepper, inputCls } from './ui'
import { showToast } from './toast'

const AMOUNT_PRESETS = [60, 90, 120, 150]

function ErrorText({ message }: { message: string | null }) {
  if (!message) return null
  return <p className="text-sm text-danger mb-3">{message}</p>
}

/** 时间输入 + 「现在」快捷键:深夜补记时少敲一次原生选择器 */
function DateTimeField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <Field label={label}>
      <div className="flex gap-2">
        <input
          type="datetime-local"
          className={`${inputCls} flex-1`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          className="btn-secondary px-4 text-sm shrink-0"
          onClick={() => onChange(toDatetimeLocal(new Date().toISOString()))}
        >
          现在
        </button>
      </div>
    </Field>
  )
}

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
  const [error, setError] = useState<string | null>(null)

  const needsAmount = type === 'bottleBreast' || type === 'formula'
  const needsMinutes = type === 'nurse'

  const save = () => {
    const tsIso = fromDatetimeLocal(ts)
    if (tsIso === null) {
      setError('请填写有效的时间。')
      return
    }
    onSave({
      id: initial.id,
      ts: tsIso,
      type,
      amountMl: needsAmount ? amountMl : undefined,
      minutes: needsMinutes ? minutes : undefined,
      note: note.trim() || undefined,
    })
    showToast('已记录 ✓')
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
      <DateTimeField
        label="时间(默认现在)"
        value={ts}
        onChange={(v) => {
          setTs(v)
          setError(null)
        }}
      />
      <Field label="备注(可选)">
        <input type="text" className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="如:吐奶一点" />
      </Field>
      <ErrorText message={error} />
      <button className="btn-primary w-full py-4 text-lg" onClick={save}>
        保存
      </button>
    </Sheet>
  )
}

export function SleepSheet({
  open,
  initial,
  allSleeps,
  onSave,
  onClose,
}: {
  open: boolean
  initial: Sleep
  /** 全部睡眠记录,用于「进行中」唯一性校验 */
  allSleeps: Sleep[]
  onSave: (sleep: Sleep) => void
  onClose: () => void
}) {
  const [start, setStart] = useState(toDatetimeLocal(initial.start))
  const [end, setEnd] = useState(toDatetimeLocal(initial.end ?? new Date().toISOString()))
  const [ongoing, setOngoing] = useState(initial.end === null)
  const [error, setError] = useState<string | null>(null)

  const save = () => {
    const startIso = fromDatetimeLocal(start)
    if (startIso === null) {
      setError('请填写有效的入睡时间。')
      return
    }
    let endIso: string | null = null
    if (!ongoing) {
      endIso = fromDatetimeLocal(end)
      if (endIso === null) {
        setError('请填写有效的醒来时间。')
        return
      }
      if (endIso <= startIso) {
        setError('醒来时间需要晚于入睡时间。')
        return
      }
    }
    const candidate: Sleep = { id: initial.id, start: startIso, end: endIso }
    const conflict = findConflictingOngoing(allSleeps, candidate)
    if (conflict) {
      setError('已有一段进行中的睡眠,请先结束它,再把这条标记为「还在睡」。')
      return
    }
    onSave(candidate)
    showToast('已记录 ✓')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="睡眠记录">
      <DateTimeField
        label="入睡时间"
        value={start}
        onChange={(v) => {
          setStart(v)
          setError(null)
        }}
      />
      <Field label="状态">
        <Segmented
          options={[
            { value: 'done', label: '已醒来' },
            { value: 'ongoing', label: '还在睡' },
          ]}
          value={ongoing ? 'ongoing' : 'done'}
          onChange={(v) => {
            setOngoing(v === 'ongoing')
            setError(null)
          }}
        />
      </Field>
      {!ongoing && (
        <DateTimeField
          label="醒来时间"
          value={end}
          onChange={(v) => {
            setEnd(v)
            setError(null)
          }}
        />
      )}
      <ErrorText message={error} />
      <button className="btn-primary w-full py-4 text-lg" onClick={save}>
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
  const [error, setError] = useState<string | null>(null)

  const save = () => {
    const tsIso = fromDatetimeLocal(ts)
    if (tsIso === null) {
      setError('请填写有效的时间。')
      return
    }
    onSave({ id: initial.id, ts: tsIso, kind, note: note.trim() || undefined })
    showToast('已记录 ✓')
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
      <DateTimeField
        label="时间"
        value={ts}
        onChange={(v) => {
          setTs(v)
          setError(null)
        }}
      />
      <Field label="备注(可选)">
        <input type="text" className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <ErrorText message={error} />
      <button className="btn-primary w-full py-4 text-lg" onClick={save}>
        保存
      </button>
    </Sheet>
  )
}

export function TempSheet({
  open,
  initial,
  onSave,
  onClose,
}: {
  open: boolean
  initial: Temperature
  onSave: (t: Temperature) => void
  onClose: () => void
}) {
  const [celsius, setCelsius] = useState(initial.celsius)
  const [site, setSite] = useState<TempSite>(initial.site ?? 'armpit')
  const [antipyretic, setAntipyretic] = useState(initial.antipyretic ?? false)
  const [ts, setTs] = useState(toDatetimeLocal(initial.ts))
  const [note, setNote] = useState(initial.note ?? '')
  const [error, setError] = useState<string | null>(null)

  const save = () => {
    const tsIso = fromDatetimeLocal(ts)
    if (tsIso === null) {
      setError('请填写有效的时间。')
      return
    }
    if (celsius < 30 || celsius > 45) {
      setError('体温数值看起来不对,请检查。')
      return
    }
    onSave({
      id: initial.id,
      ts: tsIso,
      celsius: Math.round(celsius * 10) / 10,
      site,
      antipyretic: antipyretic || undefined,
      note: note.trim() || undefined,
    })
    showToast('已记录 ✓')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="体温记录">
      <Field label="体温">
        <Stepper
          value={celsius}
          onChange={(v) => {
            setCelsius(Math.round(v * 10) / 10)
            setError(null)
          }}
          step={0.1}
          min={30}
          unit="°C"
          presets={[36.5, 37.5, 38.5, 39]}
          format={(v) => v.toFixed(1)}
        />
      </Field>
      <Field label="测量部位">
        <Segmented
          options={(Object.keys(tempSiteLabels) as TempSite[]).map((s) => ({
            value: s,
            label: tempSiteLabels[s],
          }))}
          value={site}
          onChange={setSite}
        />
      </Field>
      <Field label="退烧药(仅记录事实)">
        <Segmented
          options={[
            { value: 'no', label: '未用' },
            { value: 'yes', label: '已用' },
          ]}
          value={antipyretic ? 'yes' : 'no'}
          onChange={(v) => setAntipyretic(v === 'yes')}
        />
      </Field>
      <DateTimeField
        label="时间(默认现在)"
        value={ts}
        onChange={(v) => {
          setTs(v)
          setError(null)
        }}
      />
      <Field label="备注(可选)">
        <input type="text" className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="如:手脚偏凉" />
      </Field>
      <ErrorText message={error} />
      <button className="btn-primary w-full py-4 text-lg" onClick={save}>
        保存
      </button>
    </Sheet>
  )
}

const DAY_MS = 24 * 60 * 60 * 1000

/** 由起始日 + 天数算含当天的结束日 */
function endDateFromDays(startDate: string, days: number): string {
  return localDateStr(new Date(parseLocalDate(startDate).getTime() + (days - 1) * DAY_MS))
}

function daysBetweenInclusive(startDate: string, endDate: string): number {
  return Math.max(
    1,
    Math.round((parseLocalDate(endDate).getTime() - parseLocalDate(startDate).getTime()) / DAY_MS) + 1,
  )
}

export function MedCourseSheet({
  open,
  initial,
  onSave,
  onDelete,
  onClose,
}: {
  open: boolean
  initial: MedCourse
  onSave: (c: MedCourse) => void
  /** 编辑已有疗程时提供;新建时不传 */
  onDelete?: () => void
  onClose: () => void
}) {
  const [name, setName] = useState(initial.name)
  const [timesPerDay, setTimesPerDay] = useState(initial.timesPerDay)
  const [startDate, setStartDate] = useState(initial.startDate)
  const [days, setDays] = useState(daysBetweenInclusive(initial.startDate, initial.endDate))
  const [note, setNote] = useState(initial.note ?? '')
  const [error, setError] = useState<string | null>(null)

  const save = () => {
    if (name.trim() === '') {
      setError('请填写药名。')
      return
    }
    if (startDate.trim() === '') {
      setError('请选择开始日期。')
      return
    }
    onSave({
      id: initial.id,
      name: name.trim(),
      timesPerDay,
      startDate,
      endDate: endDateFromDays(startDate, days),
      note: note.trim() || undefined,
    })
    showToast('已保存 ✓')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="用药疗程">
      <Field label="药名">
        <input
          type="text"
          className={inputCls}
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setError(null)
          }}
          placeholder="如:头孢克肟"
        />
      </Field>
      <Field label="每日次数">
        <Stepper value={timesPerDay} onChange={setTimesPerDay} step={1} min={1} unit="次/日" presets={[1, 2, 3]} />
      </Field>
      <Field label="开始日期">
        <input
          type="date"
          className={inputCls}
          value={startDate}
          onChange={(e) => {
            setStartDate(e.target.value)
            setError(null)
          }}
        />
      </Field>
      <Field label="疗程天数">
        <Stepper value={days} onChange={setDays} step={1} min={1} unit="天" presets={[3, 5, 7, 14]} />
      </Field>
      <Field label="剂量备注(可选)">
        <input type="text" className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="如:2.5ml/次,餐后" />
      </Field>
      <ErrorText message={error} />
      <button className="btn-primary w-full py-4 text-lg" onClick={save}>
        保存
      </button>
      {onDelete && (
        <button className="btn-ghost w-full py-3 mt-2 text-sm" onClick={onDelete}>
          删除该疗程及其打卡记录
        </button>
      )}
    </Sheet>
  )
}

export function DoseSheet({
  open,
  initial,
  courseName,
  onSave,
  onClose,
}: {
  open: boolean
  initial: MedDose
  courseName: string
  onSave: (d: MedDose) => void
  onClose: () => void
}) {
  const [ts, setTs] = useState(toDatetimeLocal(initial.ts))
  const [error, setError] = useState<string | null>(null)

  const save = () => {
    const tsIso = fromDatetimeLocal(ts)
    if (tsIso === null) {
      setError('请填写有效的时间。')
      return
    }
    onSave({ ...initial, ts: tsIso })
    showToast('已记录 ✓')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={`服药 · ${courseName}`}>
      <DateTimeField
        label="服药时间"
        value={ts}
        onChange={(v) => {
          setTs(v)
          setError(null)
        }}
      />
      <ErrorText message={error} />
      <button className="btn-primary w-full py-4 text-lg" onClick={save}>
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
  const [error, setError] = useState<string | null>(null)

  const parse = (s: string): number | undefined => {
    const n = Number(s)
    return s.trim() !== '' && Number.isFinite(n) && n > 0 ? n : undefined
  }

  const numField = (
    label: string,
    value: string,
    setValue: (v: string) => void,
    placeholder: string,
    step: string,
  ) => (
    <Field label={label}>
      <input
        type="number"
        inputMode="decimal"
        step={step}
        className={inputCls}
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          setError(null)
        }}
        placeholder={placeholder}
      />
    </Field>
  )

  const save = () => {
    if (date.trim() === '') {
      setError('请选择测量日期。')
      return
    }
    const g: Growth = {
      id: initial.id,
      date,
      weightKg: parse(weightKg),
      lengthCm: parse(lengthCm),
      headCm: parse(headCm),
    }
    if (g.weightKg == null && g.lengthCm == null && g.headCm == null) {
      setError('体重 / 身长 / 头围至少填一项(需为正数)。')
      return
    }
    onSave(g)
    showToast('已记录 ✓')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="生长测量">
      <Field label="测量日期">
        <input
          type="date"
          className={inputCls}
          value={date}
          onChange={(e) => {
            setDate(e.target.value)
            setError(null)
          }}
        />
      </Field>
      {numField('体重 kg', weightKg, setWeightKg, '如 7.25', '0.01')}
      {numField('身长 cm', lengthCm, setLengthCm, '如 68.5', '0.1')}
      {numField('头围 cm', headCm, setHeadCm, '如 43.0', '0.1')}
      <ErrorText message={error} />
      <button className="btn-primary w-full py-4 text-lg" onClick={save}>
        保存
      </button>
    </Sheet>
  )
}
