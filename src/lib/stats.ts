// 「今日」统计:按本地日历日聚合,服务于首页各模块。
// 注意与 src/lib/summary.ts 的区别:摘要按「滚动时间窗」(最近 24h/7d)聚合,
// 两套口径是有意不同的(「今天睡了多久」vs「最近 24 小时睡了多久」),不要合并。
import type { Diaper, Feed, Sleep } from '../types'
import { isSameLocalDay, localDateStr, sleepBelongsToDay, sleepMinutes } from './dates'

export interface FeedDayStats {
  count: number
  totalMl: number
  nurseMinutes: number
  /** 最近一次喂养的 ISO 时间;无则 null */
  lastTs: string | null
}

export function feedStatsForDay(feeds: Feed[], now: Date): FeedDayStats {
  const today = feeds.filter((f) => isSameLocalDay(f.ts, now))
  const totalMl = today.reduce((sum, f) => sum + (f.amountMl ?? 0), 0)
  const nurseMinutes = today.reduce((sum, f) => sum + (f.minutes ?? 0), 0)
  // 「距上次」看全部记录而不只看今天:凌晨第一顿前应显示昨晚那顿
  const last = feeds
    .filter((f) => new Date(f.ts).getTime() <= now.getTime())
    .sort((a, b) => b.ts.localeCompare(a.ts))[0]
  return { count: today.length, totalMl, nurseMinutes, lastTs: last?.ts ?? null }
}

export interface SleepDayStats {
  totalMinutes: number
  segments: number
  longestMinutes: number
  /** 进行中的睡眠段(若有) */
  ongoing: Sleep | null
}

/**
 * 今日睡眠统计:跨夜睡眠整段归属入睡日(sleepBelongsToDay)。
 * 进行中的段也计入(按 now 截断计时)。
 */
export function sleepStatsForDay(sleeps: Sleep[], now: Date): SleepDayStats {
  const dayStr = localDateStr(now)
  const today = sleeps.filter((s) => sleepBelongsToDay(s.start) === dayStr)
  let totalMinutes = 0
  let longestMinutes = 0
  for (const s of today) {
    const min = sleepMinutes(s.start, s.end, now)
    totalMinutes += min
    if (min > longestMinutes) longestMinutes = min
  }
  const ongoing = sleeps.find((s) => s.end === null) ?? null
  return { totalMinutes, segments: today.length, longestMinutes, ongoing }
}

export interface DiaperDayStats {
  total: number
  wet: number
  dirty: number
  mixed: number
}

export function diaperStatsForDay(diapers: Diaper[], now: Date): DiaperDayStats {
  const today = diapers.filter((d) => isSameLocalDay(d.ts, now))
  return {
    total: today.length,
    wet: today.filter((d) => d.kind === 'wet').length,
    dirty: today.filter((d) => d.kind === 'dirty').length,
    mixed: today.filter((d) => d.kind === 'mixed').length,
  }
}

/**
 * 进行中睡眠唯一性:保存 candidate 后是否会出现第二条 end=null 的记录。
 * 返回冲突的那条;无冲突返回 null。
 */
export function findConflictingOngoing(sleeps: Sleep[], candidate: Sleep): Sleep | null {
  if (candidate.end !== null) return null
  return sleeps.find((s) => s.end === null && s.id !== candidate.id) ?? null
}

/** 收集所有有记录的日子(用于连续打卡统计) */
export function collectRecordDays(
  feeds: Feed[],
  sleeps: Sleep[],
  diapers: Diaper[],
  growthDates: string[],
): Set<string> {
  const days = new Set<string>()
  for (const f of feeds) days.add(localDateStr(new Date(f.ts)))
  for (const s of sleeps) days.add(localDateStr(new Date(s.start)))
  for (const d of diapers) days.add(localDateStr(new Date(d.ts)))
  for (const g of growthDates) days.add(g)
  return days
}
