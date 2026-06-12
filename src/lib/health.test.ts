import { describe, expect, it } from 'vitest'
import type { MedCourse, MedDose, Temperature } from '../types'
import { activeCourses, aggregateTemps, courseAdherence, doseCountForDay, tempsInWindow } from './health'

const now = new Date(2026, 5, 12, 20, 0) // 2026-06-12 20:00 本地

function hoursAgo(h: number): string {
  return new Date(now.getTime() - h * 3600_000).toISOString()
}

describe('aggregateTemps', () => {
  const temps: Temperature[] = [
    { id: '1', ts: hoursAgo(2), celsius: 37.8, site: 'ear' },
    { id: '2', ts: hoursAgo(10), celsius: 38.6, antipyretic: true },
    { id: '3', ts: hoursAgo(30), celsius: 39.1 }, // 超出 24h
  ]
  it('24h 窗口:次数/最高/最近/退烧药次数', () => {
    const a = aggregateTemps(temps, now, 24)
    expect(a.count).toBe(2)
    expect(a.maxC).toBe(38.6)
    expect(a.latest?.celsius).toBe(37.8)
    expect(a.antipyreticCount).toBe(1)
  })
  it('7d 窗口包含更早记录;空窗口返回 null 最高值', () => {
    expect(aggregateTemps(temps, now, 24 * 7).maxC).toBe(39.1)
    expect(aggregateTemps([], now, 24)).toEqual({ count: 0, maxC: null, latest: null, antipyreticCount: 0 })
  })
  it('tempsInWindow 升序返回窗口内点', () => {
    const w = tempsInWindow(temps, now, 24)
    expect(w.map((t) => t.id)).toEqual(['2', '1'])
  })
})

describe('activeCourses(疗程日期边界)', () => {
  const course: MedCourse = {
    id: 'c1',
    name: '头孢克肟',
    timesPerDay: 3,
    startDate: '2026-06-10',
    endDate: '2026-06-16',
  }
  it('起止当天都算进行中', () => {
    expect(activeCourses([course], new Date(2026, 5, 10))).toHaveLength(1)
    expect(activeCourses([course], new Date(2026, 5, 16))).toHaveLength(1)
  })
  it('开始前与结束后不算', () => {
    expect(activeCourses([course], new Date(2026, 5, 9))).toHaveLength(0)
    expect(activeCourses([course], new Date(2026, 5, 17))).toHaveLength(0)
  })
})

describe('doseCountForDay / courseAdherence', () => {
  const course: MedCourse = {
    id: 'c1',
    name: '头孢克肟',
    timesPerDay: 3,
    startDate: '2026-06-10',
    endDate: '2026-06-16',
  }
  const doses: MedDose[] = [
    { id: '1', courseId: 'c1', ts: hoursAgo(1) }, // 今天
    { id: '2', courseId: 'c1', ts: hoursAgo(5) }, // 今天
    { id: '3', courseId: 'c1', ts: hoursAgo(26) }, // 昨天
    { id: '4', courseId: 'other', ts: hoursAgo(2) }, // 其他疗程
  ]
  it('按本地日历日与疗程过滤打卡', () => {
    expect(doseCountForDay(doses, 'c1', now)).toBe(2)
  })
  it('依从统计:疗程第几天、今日次数、近 7 天应服约数', () => {
    const a = courseAdherence(course, doses, now)
    expect(a.dayOfCourse).toBe(3) // 6-10 起,6-12 为第 3 天
    expect(a.totalDays).toBe(7)
    expect(a.todayCount).toBe(2)
    expect(a.recent7dActual).toBe(3)
    // 窗口与疗程重叠 6-10..6-12 共 3 天 × 3 次
    expect(a.recent7dExpected).toBe(9)
  })
  it('未开始的疗程 dayOfCourse 为 0', () => {
    const future: MedCourse = { ...course, startDate: '2026-06-20', endDate: '2026-06-26' }
    expect(courseAdherence(future, [], now).dayOfCourse).toBe(0)
  })
})
