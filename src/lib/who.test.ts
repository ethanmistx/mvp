import { describe, expect, it } from 'vitest'
import { whoStandards } from '../data/whoStandards'
import { classifyBand, describeMeasurement, whoPercentilesAt } from './who'

describe('whoPercentilesAt(插值)', () => {
  it('整月龄直接取表值', () => {
    const p = whoPercentilesAt('boy', 'weightKg', 6)
    expect(p).toEqual({
      p3: whoStandards.boy.weightKg[6][0],
      p50: whoStandards.boy.weightKg[6][1],
      p97: whoStandards.boy.weightKg[6][2],
    })
  })
  it('半月龄取两侧线性中点', () => {
    const t5 = whoStandards.girl.lengthCm[5]
    const t6 = whoStandards.girl.lengthCm[6]
    const p = whoPercentilesAt('girl', 'lengthCm', 5.5)!
    expect(p.p50).toBeCloseTo((t5[1] + t6[1]) / 2, 10)
  })
  it('上边界 24 月可取值,越界返回 null', () => {
    expect(whoPercentilesAt('boy', 'headCm', 24)).not.toBeNull()
    expect(whoPercentilesAt('boy', 'headCm', 24.01)).toBeNull()
    expect(whoPercentilesAt('boy', 'headCm', -0.1)).toBeNull()
  })
  it('表数据单调性自检:P3 < P50 < P97 且 P50 随月龄不减', () => {
    for (const sex of ['boy', 'girl'] as const) {
      for (const metric of ['weightKg', 'lengthCm', 'headCm'] as const) {
        const table = whoStandards[sex][metric]
        let prevP50 = -Infinity
        for (const [p3, p50, p97] of table) {
          expect(p3).toBeLessThan(p50)
          expect(p50).toBeLessThan(p97)
          expect(p50).toBeGreaterThanOrEqual(prevP50)
          prevP50 = p50
        }
      }
    }
  })
})

describe('classifyBand(区间判断)', () => {
  const p = { p3: 6.4, p50: 7.9, p97: 9.7 }
  it('低于 P3', () => expect(classifyBand(6.0, p)).toBe('belowP3'))
  it('P3 边界含在 P3–P50', () => expect(classifyBand(6.4, p)).toBe('p3ToP50'))
  it('P50 边界含在 P3–P50', () => expect(classifyBand(7.9, p)).toBe('p3ToP50'))
  it('P50–P97', () => expect(classifyBand(8.8, p)).toBe('p50ToP97'))
  it('P97 边界含在 P50–P97', () => expect(classifyBand(9.7, p)).toBe('p50ToP97'))
  it('高于 P97', () => expect(classifyBand(10.0, p)).toBe('aboveP97'))
})

describe('describeMeasurement(文字说明,红线检查)', () => {
  it('常见范围措辞克制,不含医疗结论词', () => {
    const text = describeMeasurement('boy', 'weightKg', 8.0, 6)
    expect(text).toContain('常见范围')
    expect(text).not.toMatch(/诊断|疾病|预警|异常/)
  })
  it('超出参考线只建议咨询医生,不下结论', () => {
    const text = describeMeasurement('girl', 'weightKg', 4.0, 6)
    expect(text).toContain('低于 P3')
    expect(text).toContain('医生')
    expect(text).not.toMatch(/诊断|营养不良|发育迟缓/)
  })
  it('月龄超出 0–24 提示以儿保为准', () => {
    expect(describeMeasurement('boy', 'weightKg', 13, 30)).toContain('超出')
  })
})
