import { describe, expect, it } from 'vitest'
import type { Diaper, Feed, Sleep } from '../types'
import { diaperStatsForDay, feedStatsForDay, findConflictingOngoing, sleepStatsForDay } from './stats'

const now = new Date(2026, 5, 10, 14, 0) // 2026-06-10 14:00 本地时间

function iso(y: number, mo: number, d: number, h: number, mi = 0): string {
  return new Date(y, mo - 1, d, h, mi).toISOString()
}

describe('feedStatsForDay', () => {
  const feeds: Feed[] = [
    { id: '1', ts: iso(2026, 6, 10, 6), type: 'formula', amountMl: 120 },
    { id: '2', ts: iso(2026, 6, 10, 10), type: 'nurse', minutes: 15 },
    { id: '3', ts: iso(2026, 6, 9, 22), type: 'formula', amountMl: 150 }, // 昨天
  ]
  it('只统计今天的次数与总量', () => {
    const s = feedStatsForDay(feeds, now)
    expect(s.count).toBe(2)
    expect(s.totalMl).toBe(120)
    expect(s.nurseMinutes).toBe(15)
  })
  it('「距上次」取全局最近一条(凌晨场景看得到昨晚)', () => {
    const earlyMorning = new Date(2026, 5, 10, 1, 0)
    const s = feedStatsForDay(feeds, earlyMorning)
    expect(s.lastTs).toBe(iso(2026, 6, 9, 22))
  })
})

describe('sleepStatsForDay(跨夜归属入睡日)', () => {
  const sleeps: Sleep[] = [
    // 昨晚 22:00 入睡,今晨 05:30 醒:整段 450 分钟归昨天
    { id: 'a', start: iso(2026, 6, 9, 22), end: iso(2026, 6, 10, 5, 30) },
    // 今天午睡 13:00–14:00 前进行中
    { id: 'b', start: iso(2026, 6, 10, 13), end: null },
  ]
  it('跨夜段不计入今天', () => {
    const s = sleepStatsForDay(sleeps, now)
    expect(s.segments).toBe(1)
    expect(s.totalMinutes).toBe(60) // 13:00 → now 14:00
  })
  it('跨夜段计入昨天且时长完整', () => {
    const yesterdayEnd = new Date(2026, 5, 9, 23, 59)
    const s = sleepStatsForDay(sleeps, yesterdayEnd)
    expect(s.segments).toBe(1)
    // 注意:对「昨天」统计时进行中的段还未开始,只有跨夜段
    expect(s.totalMinutes).toBe(450)
    expect(s.longestMinutes).toBe(450)
  })
  it('进行中状态可被发现', () => {
    expect(sleepStatsForDay(sleeps, now).ongoing?.id).toBe('b')
  })
})

describe('findConflictingOngoing(进行中唯一性)', () => {
  const sleeps: Sleep[] = [
    { id: 'a', start: iso(2026, 6, 9, 22), end: iso(2026, 6, 10, 5) },
    { id: 'b', start: iso(2026, 6, 10, 13), end: null },
  ]
  it('把另一条改成进行中 → 检出与 b 冲突', () => {
    const candidate: Sleep = { id: 'a', start: iso(2026, 6, 9, 22), end: null }
    expect(findConflictingOngoing(sleeps, candidate)?.id).toBe('b')
  })
  it('编辑进行中那条自己不算冲突', () => {
    const candidate: Sleep = { id: 'b', start: iso(2026, 6, 10, 13), end: null }
    expect(findConflictingOngoing(sleeps, candidate)).toBeNull()
  })
  it('已结束的记录不参与冲突', () => {
    const candidate: Sleep = { id: 'c', start: iso(2026, 6, 10, 15), end: iso(2026, 6, 10, 16) }
    expect(findConflictingOngoing(sleeps, candidate)).toBeNull()
  })
})

describe('diaperStatsForDay', () => {
  const diapers: Diaper[] = [
    { id: '1', ts: iso(2026, 6, 10, 7), kind: 'wet' },
    { id: '2', ts: iso(2026, 6, 10, 9), kind: 'dirty' },
    { id: '3', ts: iso(2026, 6, 10, 12), kind: 'mixed' },
    { id: '4', ts: iso(2026, 6, 9, 23), kind: 'wet' },
  ]
  it('按本地日历日计数并分类', () => {
    const s = diaperStatsForDay(diapers, now)
    expect(s).toEqual({ total: 3, wet: 1, dirty: 1, mixed: 1 })
  })
})
