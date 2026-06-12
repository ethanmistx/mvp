// 结构化文本摘要:最近 24h / 7d 的喂养、睡眠、尿布、生长趋势。
// Phase 1:同一份聚合数据有两种输出——
//   generateSummary()           给人读的纯文本(复制给医生/群友)
//   generateStructuredSummary() 给 LLM 读的 JSON(AI 解读的输入)
// 两者共享下方的窗口聚合函数,保证口径一致。

import type { BabyProfile, Diaper, Feed, Growth, MedCourse, MedDose, Sleep, Temperature } from '../types'
import { dayOfLife, formatMinutes, monthsAndDays, sleepMinutes, timeAgo } from './dates'
import { aggregateTemps, activeCourses, courseAdherence, type TempAgg } from './health'
import { tempSiteLabels } from './labels'
import { describeMeasurement } from './who'
import { ageInMonths } from './dates'

export interface SummaryInput {
  profile: BabyProfile
  feeds: Feed[]
  sleeps: Sleep[]
  diapers: Diaper[]
  growths: Growth[]
  temperatures: Temperature[]
  medCourses: MedCourse[]
  medDoses: MedDose[]
  now: Date
}

function inWindow(iso: string, now: Date, hours: number): boolean {
  const t = new Date(iso).getTime()
  return t > now.getTime() - hours * 3600_000 && t <= now.getTime()
}

export interface FeedAgg {
  count: number
  totalMl: number
  nurseCount: number
  nurseMinutes: number
  solidCount: number
}

export function aggregateFeeds(feeds: Feed[], now: Date, hours: number): FeedAgg {
  const list = feeds.filter((f) => inWindow(f.ts, now, hours))
  return {
    count: list.length,
    totalMl: list.reduce((s, f) => s + (f.amountMl ?? 0), 0),
    nurseCount: list.filter((f) => f.type === 'nurse').length,
    nurseMinutes: list.reduce((s, f) => s + (f.minutes ?? 0), 0),
    solidCount: list.filter((f) => f.type === 'solid').length,
  }
}

export interface SleepAgg {
  segments: number
  totalMinutes: number
  longestMinutes: number
}

/** 窗口内睡眠按重叠部分计时:跨窗口边界的段只计窗口内时长 */
export function aggregateSleeps(sleeps: Sleep[], now: Date, hours: number): SleepAgg {
  const windowStart = now.getTime() - hours * 3600_000
  let totalMinutes = 0
  let segments = 0
  let longestMinutes = 0
  for (const s of sleeps) {
    const start = new Date(s.start).getTime()
    const end = s.end ? new Date(s.end).getTime() : now.getTime()
    const overlap = Math.min(end, now.getTime()) - Math.max(start, windowStart)
    if (overlap <= 0) continue
    segments += 1
    const min = Math.round(overlap / 60000)
    totalMinutes += min
    if (min > longestMinutes) longestMinutes = min
  }
  return { segments, totalMinutes, longestMinutes }
}

export interface DiaperAgg {
  total: number
  wet: number
  dirty: number
  mixed: number
}

export function aggregateDiapers(diapers: Diaper[], now: Date, hours: number): DiaperAgg {
  const list = diapers.filter((d) => inWindow(d.ts, now, hours))
  return {
    total: list.length,
    wet: list.filter((d) => d.kind === 'wet').length,
    dirty: list.filter((d) => d.kind === 'dirty').length,
    mixed: list.filter((d) => d.kind === 'mixed').length,
  }
}

export interface GrowthAgg {
  /** 最近一次测量(任意指标) */
  latest: Growth | null
  /** 最近一次各指标的区间文字说明 */
  descriptions: string[]
  /** 与上一次体重记录的差值(kg),无可比记录则 null */
  weightDeltaKg: number | null
  prevWeightDate: string | null
}

export function aggregateGrowth(profile: BabyProfile, growths: Growth[]): GrowthAgg {
  const sorted = [...growths].sort((a, b) => a.date.localeCompare(b.date))
  const latest = sorted[sorted.length - 1] ?? null
  if (!latest) return { latest: null, descriptions: [], weightDeltaKg: null, prevWeightDate: null }

  const age = ageInMonths(profile.birthDate, latest.date)
  const descriptions: string[] = []
  if (latest.weightKg != null)
    descriptions.push(describeMeasurement(profile.sex, 'weightKg', latest.weightKg, age))
  if (latest.lengthCm != null)
    descriptions.push(describeMeasurement(profile.sex, 'lengthCm', latest.lengthCm, age))
  if (latest.headCm != null)
    descriptions.push(describeMeasurement(profile.sex, 'headCm', latest.headCm, age))

  let weightDeltaKg: number | null = null
  let prevWeightDate: string | null = null
  if (latest.weightKg != null) {
    const prev = sorted.slice(0, -1).reverse().find((g) => g.weightKg != null)
    if (prev) {
      weightDeltaKg = Math.round((latest.weightKg - prev.weightKg!) * 100) / 100
      prevWeightDate = prev.date
    }
  }
  return { latest, descriptions, weightDeltaKg, prevWeightDate }
}

// ---------- 文本输出 ----------

function feedSection(feeds: Feed[], now: Date, hours: number): string[] {
  const a = aggregateFeeds(feeds, now, hours)
  if (a.count === 0) return ['- 喂养:无记录']
  const parts = [`共 ${a.count} 次`]
  if (a.totalMl > 0) parts.push(`瓶喂/配方合计 ${a.totalMl} ml`)
  if (a.nurseCount > 0) parts.push(`亲喂 ${a.nurseCount} 次共 ${a.nurseMinutes} 分钟`)
  if (a.solidCount > 0) parts.push(`辅食 ${a.solidCount} 次`)
  return [`- 喂养:${parts.join(',')}`]
}

function sleepSection(sleeps: Sleep[], now: Date, hours: number): string[] {
  const a = aggregateSleeps(sleeps, now, hours)
  if (a.segments === 0) return ['- 睡眠:无记录']
  return [
    `- 睡眠:共 ${a.segments} 段,合计 ${formatMinutes(a.totalMinutes)},最长一段 ${formatMinutes(a.longestMinutes)}`,
  ]
}

function diaperSection(diapers: Diaper[], now: Date, hours: number): string[] {
  const a = aggregateDiapers(diapers, now, hours)
  if (a.total === 0) return ['- 尿布:无记录']
  return [`- 尿布:共 ${a.total} 次(尿湿 ${a.wet},便便 ${a.dirty},混合 ${a.mixed})`]
}

// 体温/用药只陈述事实数字,不出现"发烧/异常"等判断(红线)
function tempSection(temps: Temperature[], now: Date, hours: number): string[] {
  const a = aggregateTemps(temps, now, hours)
  if (a.count === 0) return []
  const site = a.latest?.site ? `,${tempSiteLabels[a.latest.site]}` : ''
  const parts = [
    `测温 ${a.count} 次`,
    `最高 ${a.maxC} °C`,
    `最近 ${a.latest!.celsius} °C(${timeAgo(a.latest!.ts, now)}${site})`,
  ]
  if (a.antipyreticCount > 0) parts.push(`用退烧药 ${a.antipyreticCount} 次`)
  return [`- 体温:${parts.join(',')}`]
}

function medSection(courses: MedCourse[], doses: MedDose[], now: Date): string[] {
  const active = activeCourses(courses, now)
  if (active.length === 0) return []
  return active.map((c) => {
    const a = courseAdherence(c, doses, now)
    const noteStr = c.note ? `(${c.note})` : ''
    return `- 用药:${c.name}${noteStr},疗程第 ${a.dayOfCourse}/${a.totalDays} 天,今日 ${a.todayCount}/${c.timesPerDay} 次,近 7 天记录 ${a.recent7dActual} 次(疗程内应服约 ${a.recent7dExpected} 次)`
  })
}

function growthSection(profile: BabyProfile, growths: Growth[]): string[] {
  const a = aggregateGrowth(profile, growths)
  if (!a.latest) return ['- 生长:暂无测量记录']
  const lines: string[] = [`- 生长(最近一次测量 ${a.latest.date}):`]
  for (const d of a.descriptions) lines.push(`  - ${d}`)
  if (a.weightDeltaKg != null && a.prevWeightDate) {
    lines.push(
      `  - 较上次(${a.prevWeightDate})体重${a.weightDeltaKg >= 0 ? '增加' : '减少'} ${Math.abs(a.weightDeltaKg)} kg`,
    )
  }
  return lines
}

export function generateSummary(input: SummaryInput): string {
  const { profile, feeds, sleeps, diapers, growths, temperatures, medCourses, medDoses, now } = input
  const { months, days } = monthsAndDays(profile.birthDate, now)
  const header = [
    `【宝宝记录摘要】生成于 ${now.toLocaleString('zh-CN')}`,
    `宝宝:${profile.name}(${profile.sex === 'boy' ? '男' : '女'}),出生第 ${dayOfLife(profile.birthDate, now)} 天,${months} 个月 ${days} 天`,
    '',
  ]
  const h24 = [
    '== 最近 24 小时 ==',
    ...feedSection(feeds, now, 24),
    ...sleepSection(sleeps, now, 24),
    ...diaperSection(diapers, now, 24),
    ...tempSection(temperatures, now, 24),
    '',
  ]
  const d7 = [
    '== 最近 7 天 ==',
    ...feedSection(feeds, now, 24 * 7),
    ...sleepSection(sleeps, now, 24 * 7),
    ...diaperSection(diapers, now, 24 * 7),
    ...tempSection(temperatures, now, 24 * 7),
    ...medSection(medCourses, medDoses, now),
    ...growthSection(profile, growths),
    '',
  ]
  const footer = ['说明:参考线为 WHO 标准,仅供日常参考,临床判断以儿保医生为准。']
  return [...header, ...h24, ...d7, ...footer].join('\n')
}

// ---------- 结构化输出(LLM 输入) ----------

export interface StructuredSummary {
  schemaVersion: 2
  generatedAt: string
  baby: {
    name: string
    sex: 'boy' | 'girl'
    birthDate: string
    dayOfLife: number
    ageMonths: number
    ageDaysInMonth: number
  }
  last24h: { feeds: FeedAgg; sleep: SleepAgg; diapers: DiaperAgg }
  last7d: { feeds: FeedAgg; sleep: SleepAgg; diapers: DiaperAgg }
  growth: {
    latestDate: string | null
    latest: { weightKg?: number; lengthCm?: number; headCm?: number } | null
    whoBandDescriptions: string[]
    weightDeltaKg: number | null
    prevWeightDate: string | null
  }
  health: {
    temps24h: TempAgg
    temps7d: TempAgg
    /** 进行中疗程的依从情况(只含事实数字) */
    meds: Array<{
      name: string
      note?: string
      timesPerDay: number
      dayOfCourse: number
      totalDays: number
      todayCount: number
      recent7dActual: number
      recent7dExpected: number
    }>
  }
}

export function generateStructuredSummary(input: SummaryInput): StructuredSummary {
  const { profile, feeds, sleeps, diapers, growths, temperatures, medCourses, medDoses, now } = input
  const { months, days } = monthsAndDays(profile.birthDate, now)
  const g = aggregateGrowth(profile, growths)
  const windowAgg = (hours: number) => ({
    feeds: aggregateFeeds(feeds, now, hours),
    sleep: aggregateSleeps(sleeps, now, hours),
    diapers: aggregateDiapers(diapers, now, hours),
  })
  return {
    schemaVersion: 2,
    generatedAt: now.toISOString(),
    baby: {
      name: profile.name,
      sex: profile.sex,
      birthDate: profile.birthDate,
      dayOfLife: dayOfLife(profile.birthDate, now),
      ageMonths: months,
      ageDaysInMonth: days,
    },
    last24h: windowAgg(24),
    last7d: windowAgg(24 * 7),
    growth: {
      latestDate: g.latest?.date ?? null,
      latest: g.latest
        ? { weightKg: g.latest.weightKg, lengthCm: g.latest.lengthCm, headCm: g.latest.headCm }
        : null,
      whoBandDescriptions: g.descriptions,
      weightDeltaKg: g.weightDeltaKg,
      prevWeightDate: g.prevWeightDate,
    },
    health: {
      temps24h: aggregateTemps(temperatures, now, 24),
      temps7d: aggregateTemps(temperatures, now, 24 * 7),
      meds: activeCourses(medCourses, now).map((c) => {
        const a = courseAdherence(c, medDoses, now)
        return {
          name: c.name,
          note: c.note,
          timesPerDay: c.timesPerDay,
          dayOfCourse: a.dayOfCourse,
          totalDays: a.totalDays,
          todayCount: a.todayCount,
          recent7dActual: a.recent7dActual,
          recent7dExpected: a.recent7dExpected,
        }
      }),
    },
  }
}

// 重新导出方便 UI 层取用
export { sleepMinutes }
