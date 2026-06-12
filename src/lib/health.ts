// 体温与用药的聚合逻辑(纯函数,可单测)。
// 红线:只输出事实数字(最高/最近/次数),不做"发烧/异常"类判断。

import type { MedCourse, MedDose, Temperature } from '../types'
import { isSameLocalDay, localDateStr, parseLocalDate, startOfDay } from './dates'

const DAY_MS = 24 * 60 * 60 * 1000

/** 窗口内体温聚合 */
export interface TempAgg {
  count: number
  maxC: number | null
  latest: Temperature | null
  antipyreticCount: number
}

export function aggregateTemps(temps: Temperature[], now: Date, hours: number): TempAgg {
  const since = now.getTime() - hours * 3600_000
  const list = temps.filter((t) => {
    const ms = new Date(t.ts).getTime()
    return ms > since && ms <= now.getTime()
  })
  const latest = [...list].sort((a, b) => b.ts.localeCompare(a.ts))[0] ?? null
  const maxC = list.length ? Math.max(...list.map((t) => t.celsius)) : null
  return {
    count: list.length,
    maxC,
    latest,
    antipyreticCount: list.filter((t) => t.antipyretic).length,
  }
}

/** 最近 hours 小时内的体温点,按时间升序(迷你曲线用) */
export function tempsInWindow(temps: Temperature[], now: Date, hours: number): Temperature[] {
  const since = now.getTime() - hours * 3600_000
  return temps
    .filter((t) => {
      const ms = new Date(t.ts).getTime()
      return ms > since && ms <= now.getTime()
    })
    .sort((a, b) => a.ts.localeCompare(b.ts))
}

/** 某天(本地日历日)正在进行中的疗程:startDate ≤ day ≤ endDate */
export function activeCourses(courses: MedCourse[], day: Date): MedCourse[] {
  const d = localDateStr(day)
  return courses
    .filter((c) => c.startDate <= d && d <= c.endDate)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
}

/** 某疗程在某天的打卡次数 */
export function doseCountForDay(doses: MedDose[], courseId: string, day: Date): number {
  return doses.filter((d) => d.courseId === courseId && isSameLocalDay(d.ts, day)).length
}

/** 疗程进度与近 7 天依从情况 */
export interface CourseAdherence {
  course: MedCourse
  todayCount: number
  /** 近 7 天实际打卡次数(仅疗程覆盖的日子) */
  recent7dActual: number
  /** 近 7 天按疗程应服的约数(覆盖日 × 每日次数,今天按整天计) */
  recent7dExpected: number
  /** 疗程第几天(1 起);未开始为 0 */
  dayOfCourse: number
  totalDays: number
}

export function courseAdherence(course: MedCourse, doses: MedDose[], now: Date): CourseAdherence {
  const today = startOfDay(now)
  const start = parseLocalDate(course.startDate)
  const end = parseLocalDate(course.endDate)
  const totalDays = Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1
  const dayOfCourse =
    today.getTime() < start.getTime()
      ? 0
      : Math.min(totalDays, Math.round((today.getTime() - start.getTime()) / DAY_MS) + 1)

  const windowStart = new Date(today.getTime() - 6 * DAY_MS)
  const overlapStart = start.getTime() > windowStart.getTime() ? start : windowStart
  const overlapEnd = end.getTime() < today.getTime() ? end : today
  const overlapDays =
    overlapEnd.getTime() < overlapStart.getTime()
      ? 0
      : Math.round((overlapEnd.getTime() - overlapStart.getTime()) / DAY_MS) + 1

  const courseDoses = doses.filter((d) => d.courseId === course.id)
  const recent7dActual = courseDoses.filter((d) => {
    const ms = new Date(d.ts).getTime()
    return ms >= overlapStart.getTime() && ms < today.getTime() + DAY_MS
  }).length

  return {
    course,
    todayCount: doseCountForDay(doses, course.id, now),
    recent7dActual,
    recent7dExpected: overlapDays * course.timesPerDay,
    dayOfCourse,
    totalDays,
  }
}
