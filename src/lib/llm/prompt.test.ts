import { describe, expect, it } from 'vitest'
import type { BabyProfile } from '../../types'
import { generateStructuredSummary } from '../summary'
import { buildInsightUserPrompt, INSIGHT_SYSTEM_PROMPT } from './prompt'

const profile: BabyProfile = { id: 'p1', name: '糖糖', birthDate: '2025-12-10', sex: 'girl' }
const now = new Date(2026, 5, 10, 20, 0)

describe('INSIGHT_SYSTEM_PROMPT(红线)', () => {
  it('明确禁止诊断与恐慌措辞,引导儿保医生', () => {
    expect(INSIGHT_SYSTEM_PROMPT).toContain('不要')
    expect(INSIGHT_SYSTEM_PROMPT).toContain('诊断')
    expect(INSIGHT_SYSTEM_PROMPT).toContain('儿保医生')
    expect(INSIGHT_SYSTEM_PROMPT).toContain('不构成医疗建议')
  })
})

describe('generateStructuredSummary + buildInsightUserPrompt', () => {
  it('结构化摘要含双窗口聚合与生长区间,prompt 内嵌完整 JSON', () => {
    const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600_000).toISOString()
    const summary = generateStructuredSummary({
      profile,
      feeds: [
        { id: '1', ts: hoursAgo(2), type: 'formula', amountMl: 120 },
        { id: '2', ts: hoursAgo(30), type: 'nurse', minutes: 15 },
      ],
      sleeps: [{ id: 's1', start: hoursAgo(3), end: hoursAgo(1) }],
      diapers: [{ id: 'd1', ts: hoursAgo(1), kind: 'wet' }],
      growths: [{ id: 'g1', date: '2026-06-09', weightKg: 7.3 }],
      temperatures: [{ id: 't1', ts: hoursAgo(2), celsius: 38.2, site: 'ear' }],
      medCourses: [
        { id: 'c1', name: '头孢克肟', timesPerDay: 3, startDate: '2026-06-09', endDate: '2026-06-15' },
      ],
      medDoses: [{ id: 'm1', courseId: 'c1', ts: hoursAgo(1) }],
      now,
    })
    expect(summary.baby).toMatchObject({ name: '糖糖', sex: 'girl', ageMonths: 6, ageDaysInMonth: 0 })
    expect(summary.last24h.feeds).toMatchObject({ count: 1, totalMl: 120 })
    expect(summary.last7d.feeds).toMatchObject({ count: 2, nurseCount: 1, nurseMinutes: 15 })
    expect(summary.last24h.sleep.totalMinutes).toBe(120)
    expect(summary.last24h.diapers.wet).toBe(1)
    expect(summary.growth.latestDate).toBe('2026-06-09')
    expect(summary.growth.whoBandDescriptions.length).toBe(1)
    expect(summary.growth.whoBandDescriptions[0]).not.toMatch(/诊断|疾病|预警/)
    // v2:健康数据进入 LLM 输入
    expect(summary.health.temps24h).toMatchObject({ count: 1, maxC: 38.2 })
    expect(summary.health.meds[0]).toMatchObject({ name: '头孢克肟', todayCount: 1, timesPerDay: 3 })

    const prompt = buildInsightUserPrompt(summary)
    expect(prompt).toContain('"name": "糖糖"')
    expect(prompt).toContain('"totalMl": 120')
  })

  it('体重趋势:与上一条含体重的记录对比', () => {
    const summary = generateStructuredSummary({
      profile,
      feeds: [],
      sleeps: [],
      diapers: [],
      growths: [
        { id: 'g1', date: '2026-05-10', weightKg: 6.8 },
        { id: 'g2', date: '2026-06-01', lengthCm: 66 }, // 无体重,应被跳过
        { id: 'g3', date: '2026-06-09', weightKg: 7.3 },
      ],
      temperatures: [],
      medCourses: [],
      medDoses: [],
      now,
    })
    expect(summary.growth.weightDeltaKg).toBeCloseTo(0.5)
    expect(summary.growth.prevWeightDate).toBe('2026-05-10')
  })
})
