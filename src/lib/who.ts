// WHO 参考线插值与区间判断(纯函数,可单测)。
// 红线提醒:本模块只输出「所处区间」的描述性文字,不做任何医疗判断。

import { WHO_MAX_MONTH, whoStandards, type Metric } from '../data/whoStandards'
import type { Sex } from '../types'

export type { Metric }

export interface PercentilePoint {
  p3: number
  p50: number
  p97: number
}

/**
 * 在整月表上做线性插值,得到任意月龄(0–24,含小数)的 P3/P50/P97。
 * 超出范围的月龄返回 null(0–3 岁产品但标准表先覆盖 0–24 月)。
 */
export function whoPercentilesAt(
  sex: Sex,
  metric: Metric,
  ageMonths: number,
): PercentilePoint | null {
  if (ageMonths < 0 || ageMonths > WHO_MAX_MONTH || Number.isNaN(ageMonths)) return null
  const table = whoStandards[sex][metric]
  const lo = Math.floor(ageMonths)
  const hi = Math.min(lo + 1, WHO_MAX_MONTH)
  const t = ageMonths - lo
  const a = table[lo]
  const b = table[hi]
  const lerp = (i: 0 | 1 | 2) => a[i] + (b[i] - a[i]) * t
  return { p3: lerp(0), p50: lerp(1), p97: lerp(2) }
}

export type Band = 'belowP3' | 'p3ToP50' | 'p50ToP97' | 'aboveP97'

/** 判断测量值落在哪个百分位区间 */
export function classifyBand(value: number, p: PercentilePoint): Band {
  if (value < p.p3) return 'belowP3'
  if (value <= p.p50) return 'p3ToP50'
  if (value <= p.p97) return 'p50ToP97'
  return 'aboveP97'
}

const metricLabels: Record<Metric, string> = {
  weightKg: '体重',
  lengthCm: '身长',
  headCm: '头围',
}

const metricUnits: Record<Metric, string> = {
  weightKg: 'kg',
  lengthCm: 'cm',
  headCm: 'cm',
}

export function metricLabel(metric: Metric): string {
  return metricLabels[metric]
}

export function metricUnit(metric: Metric): string {
  return metricUnits[metric]
}

/**
 * 生成最近一次测量的区间文字说明。
 * 措辞克制:只描述区间位置,不下任何医疗结论(红线要求)。
 */
export function describeMeasurement(
  sex: Sex,
  metric: Metric,
  value: number,
  ageMonths: number,
): string {
  const p = whoPercentilesAt(sex, metric, ageMonths)
  const label = metricLabels[metric]
  const unit = metricUnits[metric]
  if (!p) {
    return `${label} ${value} ${unit}:月龄超出 0–24 月参考表范围,请以儿保测评为准。`
  }
  const band = classifyBand(value, p)
  const ref = `同月龄参考:P3 ${round1(p.p3)} / P50 ${round1(p.p50)} / P97 ${round1(p.p97)} ${unit}`
  switch (band) {
    case 'belowP3':
      return `${label} ${value} ${unit},低于 P3 参考线。${ref}。建议下次儿保时请医生看看。`
    case 'p3ToP50':
      return `${label} ${value} ${unit},位于 P3–P50 之间,在同月龄常见范围内。${ref}。`
    case 'p50ToP97':
      return `${label} ${value} ${unit},位于 P50–P97 之间,在同月龄常见范围内。${ref}。`
    case 'aboveP97':
      return `${label} ${value} ${unit},高于 P97 参考线。${ref}。建议下次儿保时请医生看看。`
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

/** 供图表使用:整条参考线(0–24 月,每 0.5 月一个点足够平滑) */
export function whoCurve(sex: Sex, metric: Metric): Array<{ month: number } & PercentilePoint> {
  const points: Array<{ month: number } & PercentilePoint> = []
  for (let m = 0; m <= WHO_MAX_MONTH; m += 0.5) {
    const p = whoPercentilesAt(sex, metric, m)
    if (p) points.push({ month: m, ...p })
  }
  return points
}
