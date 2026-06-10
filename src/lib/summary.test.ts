import { describe, expect, it } from 'vitest'
import type { BabyProfile } from '../types'
import { generateSummary } from './summary'

const profile: BabyProfile = { id: 'p1', name: '糖糖', birthDate: '2025-12-10', sex: 'boy' }
const now = new Date(2026, 5, 10, 20, 0) // 2026-06-10 20:00,恰好 6 个月

function hoursAgo(h: number): string {
  return new Date(now.getTime() - h * 3600_000).toISOString()
}

describe('generateSummary', () => {
  it('空数据也能生成完整骨架', () => {
    const text = generateSummary({ profile, feeds: [], sleeps: [], diapers: [], growths: [], now })
    expect(text).toContain('糖糖')
    expect(text).toContain('最近 24 小时')
    expect(text).toContain('最近 7 天')
    expect(text).toContain('喂养:无记录')
    expect(text).toContain('WHO 标准')
  })

  it('24h 窗口只统计窗口内记录,7d 窗口统计全部', () => {
    const feeds = [
      { id: '1', ts: hoursAgo(2), type: 'formula' as const, amountMl: 120 },
      { id: '2', ts: hoursAgo(30), type: 'formula' as const, amountMl: 150 }, // 超出 24h,但在 7d 内
    ]
    const text = generateSummary({ profile, feeds, sleeps: [], diapers: [], growths: [], now })
    const [, h24, d7] = text.split(/== 最近 24 小时 ==|== 最近 7 天 ==/)
    expect(h24).toContain('共 1 次')
    expect(h24).toContain('120 ml')
    expect(d7).toContain('共 2 次')
    expect(d7).toContain('270 ml')
  })

  it('跨窗口边界的睡眠只计窗口内的重叠时长', () => {
    // 26 小时前入睡、22 小时前醒:与 24h 窗口重叠 2 小时
    const sleeps = [{ id: 's1', start: hoursAgo(26), end: hoursAgo(22) }]
    const text = generateSummary({ profile, feeds: [], sleeps, diapers: [], growths: [], now })
    const h24 = text.split('== 最近 7 天 ==')[0]
    expect(h24).toContain('2 小时')
  })

  it('生长趋势:含区间说明与上次对比', () => {
    const growths = [
      { id: 'g1', date: '2026-05-10', weightKg: 7.0 },
      { id: 'g2', date: '2026-06-09', weightKg: 7.9 },
    ]
    const text = generateSummary({ profile, feeds: [], sleeps: [], diapers: [], growths, now })
    expect(text).toContain('2026-06-09')
    expect(text).toContain('体重 7.9 kg')
    expect(text).toContain('增加 0.9 kg')
    expect(text).not.toMatch(/诊断|疾病|预警/)
  })

  it('尿布分类计数', () => {
    const diapers = [
      { id: '1', ts: hoursAgo(1), kind: 'wet' as const },
      { id: '2', ts: hoursAgo(3), kind: 'dirty' as const },
      { id: '3', ts: hoursAgo(5), kind: 'wet' as const },
    ]
    const text = generateSummary({ profile, feeds: [], sleeps: [], diapers, growths: [], now })
    expect(text).toContain('共 3 次(尿湿 2,便便 1,混合 0)')
  })
})
