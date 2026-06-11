import { describe, expect, it } from 'vitest'
import {
  ageInMonths,
  dayOfLife,
  fromDatetimeLocal,
  monthsAndDays,
  sleepBelongsToDay,
  sleepMinutes,
  streakDays,
  toDatetimeLocal,
} from './dates'

describe('dayOfLife', () => {
  it('出生当天为第 1 天', () => {
    expect(dayOfLife('2026-06-10', new Date(2026, 5, 10, 8, 0))).toBe(1)
  })
  it('次日为第 2 天(跨日按日历日,不按 24 小时)', () => {
    expect(dayOfLife('2026-06-10', new Date(2026, 5, 11, 0, 5))).toBe(2)
  })
  it('满一年(含闰日情形)正确累计', () => {
    // 2024 闰年:2024-02-01 → 2025-02-01 共 366 天,出生日算第 1 天
    expect(dayOfLife('2024-02-01', new Date(2025, 1, 1))).toBe(367)
  })
})

describe('monthsAndDays', () => {
  it('不足一个月只显示天数', () => {
    expect(monthsAndDays('2026-05-20', new Date(2026, 5, 9))).toEqual({ months: 0, days: 20 })
  })
  it('同号日即满月', () => {
    expect(monthsAndDays('2026-03-15', new Date(2026, 5, 15))).toEqual({ months: 3, days: 0 })
  })
  it('月末出生、目标月更短:钳到月末算满月', () => {
    // 1-31 出生,2-28(平年)即满 1 个月,3-01 是 1 个月 1 天
    expect(monthsAndDays('2026-01-31', new Date(2026, 1, 28))).toEqual({ months: 1, days: 0 })
    expect(monthsAndDays('2026-01-31', new Date(2026, 2, 1))).toEqual({ months: 1, days: 1 })
  })
  it('今天还差几天满月时不进位', () => {
    expect(monthsAndDays('2026-03-20', new Date(2026, 5, 18))).toEqual({ months: 2, days: 29 })
  })
})

describe('ageInMonths(图表 x 轴)', () => {
  it('出生日为 0', () => {
    expect(ageInMonths('2026-01-01', '2026-01-01')).toBe(0)
  })
  it('一个标准月 ≈ 30.4375 天', () => {
    expect(ageInMonths('2026-01-01', '2026-01-31')).toBeCloseTo(30 / 30.4375, 5)
  })
  it('一年 ≈ 12 个月', () => {
    expect(ageInMonths('2025-01-01', '2026-01-01')).toBeCloseTo(365 / 30.4375, 5)
  })
})

describe('sleepBelongsToDay(跨夜归属)', () => {
  it('晚上入睡跨到次日,归属入睡日', () => {
    const start = new Date(2026, 5, 9, 22, 30).toISOString()
    expect(sleepBelongsToDay(start)).toBe('2026-06-09')
  })
  it('凌晨入睡归属当天', () => {
    const start = new Date(2026, 5, 10, 2, 0).toISOString()
    expect(sleepBelongsToDay(start)).toBe('2026-06-10')
  })
})

describe('sleepMinutes', () => {
  it('已结束的段按 start/end 计', () => {
    const start = new Date(2026, 5, 9, 22, 0).toISOString()
    const end = new Date(2026, 5, 10, 5, 30).toISOString()
    expect(sleepMinutes(start, end, new Date())).toBe(450)
  })
  it('进行中的段按 now 截断', () => {
    const start = new Date(2026, 5, 10, 13, 0).toISOString()
    expect(sleepMinutes(start, null, new Date(2026, 5, 10, 13, 45))).toBe(45)
  })
})

describe('fromDatetimeLocal(必须能安全处理被清空的输入)', () => {
  it('空串与非法输入返回 null 而不是抛错', () => {
    expect(fromDatetimeLocal('')).toBeNull()
    expect(fromDatetimeLocal('   ')).toBeNull()
    expect(fromDatetimeLocal('not-a-date')).toBeNull()
  })
  it('与 toDatetimeLocal 往返(分钟精度)', () => {
    const iso = new Date(2026, 5, 10, 13, 45).toISOString()
    expect(fromDatetimeLocal(toDatetimeLocal(iso))).toBe(iso)
  })
})

describe('streakDays', () => {
  const now = new Date(2026, 5, 10, 9, 0)
  it('今天已记录:从今天连续往前数', () => {
    const days = new Set(['2026-06-10', '2026-06-09', '2026-06-08'])
    expect(streakDays(days, now)).toBe(3)
  })
  it('今天未记录:从昨天起算,不打断连续', () => {
    const days = new Set(['2026-06-09', '2026-06-08'])
    expect(streakDays(days, now)).toBe(2)
  })
  it('中间断档则截断', () => {
    const days = new Set(['2026-06-10', '2026-06-08'])
    expect(streakDays(days, now)).toBe(1)
  })
  it('完全无记录为 0', () => {
    expect(streakDays(new Set(), now)).toBe(0)
  })
})
