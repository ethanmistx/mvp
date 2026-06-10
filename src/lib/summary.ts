// 结构化文本摘要:最近 24h / 7d 的喂养、睡眠、尿布、生长趋势。
// 这是 Phase 1 LLM 解读层的数据接口雏形:输入为完整数据 + 当前时间,
// 输出为稳定格式的纯文本,可直接复制给医生或粘贴进 LLM。

import type { BabyProfile, Diaper, Feed, Growth, Sleep } from '../types'
import { dayOfLife, formatMinutes, monthsAndDays, sleepMinutes } from './dates'
import { describeMeasurement } from './who'
import { ageInMonths } from './dates'

export interface SummaryInput {
  profile: BabyProfile
  feeds: Feed[]
  sleeps: Sleep[]
  diapers: Diaper[]
  growths: Growth[]
  now: Date
}

function inWindow(iso: string, now: Date, hours: number): boolean {
  const t = new Date(iso).getTime()
  return t > now.getTime() - hours * 3600_000 && t <= now.getTime()
}

function feedSection(feeds: Feed[], now: Date, hours: number): string[] {
  const list = feeds.filter((f) => inWindow(f.ts, now, hours))
  if (list.length === 0) return ['- 喂养:无记录']
  const totalMl = list.reduce((s, f) => s + (f.amountMl ?? 0), 0)
  const nurseCount = list.filter((f) => f.type === 'nurse').length
  const nurseMin = list.reduce((s, f) => s + (f.minutes ?? 0), 0)
  const solidCount = list.filter((f) => f.type === 'solid').length
  const parts = [`共 ${list.length} 次`]
  if (totalMl > 0) parts.push(`瓶喂/配方合计 ${totalMl} ml`)
  if (nurseCount > 0) parts.push(`亲喂 ${nurseCount} 次共 ${nurseMin} 分钟`)
  if (solidCount > 0) parts.push(`辅食 ${solidCount} 次`)
  return [`- 喂养:${parts.join(',')}`]
}

function sleepSection(sleeps: Sleep[], now: Date, hours: number): string[] {
  // 窗口内的睡眠按重叠部分计时:跨窗口边界的段只计窗口内时长
  const windowStart = now.getTime() - hours * 3600_000
  let total = 0
  let segments = 0
  let longest = 0
  for (const s of sleeps) {
    const start = new Date(s.start).getTime()
    const end = s.end ? new Date(s.end).getTime() : now.getTime()
    const overlap = Math.min(end, now.getTime()) - Math.max(start, windowStart)
    if (overlap <= 0) continue
    segments += 1
    const min = Math.round(overlap / 60000)
    total += min
    if (min > longest) longest = min
  }
  if (segments === 0) return ['- 睡眠:无记录']
  return [`- 睡眠:共 ${segments} 段,合计 ${formatMinutes(total)},最长一段 ${formatMinutes(longest)}`]
}

function diaperSection(diapers: Diaper[], now: Date, hours: number): string[] {
  const list = diapers.filter((d) => inWindow(d.ts, now, hours))
  if (list.length === 0) return ['- 尿布:无记录']
  const wet = list.filter((d) => d.kind === 'wet').length
  const dirty = list.filter((d) => d.kind === 'dirty').length
  const mixed = list.filter((d) => d.kind === 'mixed').length
  return [`- 尿布:共 ${list.length} 次(尿湿 ${wet},便便 ${dirty},混合 ${mixed})`]
}

function growthSection(profile: BabyProfile, growths: Growth[], now: Date): string[] {
  const sorted = [...growths].sort((a, b) => a.date.localeCompare(b.date))
  if (sorted.length === 0) return ['- 生长:暂无测量记录']
  const latest = sorted[sorted.length - 1]
  const lines: string[] = [`- 生长(最近一次测量 ${latest.date}):`]
  const age = ageInMonths(profile.birthDate, latest.date)
  if (latest.weightKg != null)
    lines.push(`  - ${describeMeasurement(profile.sex, 'weightKg', latest.weightKg, age)}`)
  if (latest.lengthCm != null)
    lines.push(`  - ${describeMeasurement(profile.sex, 'lengthCm', latest.lengthCm, age)}`)
  if (latest.headCm != null)
    lines.push(`  - ${describeMeasurement(profile.sex, 'headCm', latest.headCm, age)}`)
  // 趋势:与上一次有同指标的记录对比
  const prev = sorted.length >= 2 ? sorted[sorted.length - 2] : null
  if (prev && latest.weightKg != null && prev.weightKg != null) {
    const diff = Math.round((latest.weightKg - prev.weightKg) * 100) / 100
    lines.push(
      `  - 较上次(${prev.date})体重${diff >= 0 ? '增加' : '减少'} ${Math.abs(diff)} kg`,
    )
  }
  void now
  return lines
}

export function generateSummary(input: SummaryInput): string {
  const { profile, feeds, sleeps, diapers, growths, now } = input
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
    '',
  ]
  const d7 = [
    '== 最近 7 天 ==',
    ...feedSection(feeds, now, 24 * 7),
    ...sleepSection(sleeps, now, 24 * 7),
    ...diaperSection(diapers, now, 24 * 7),
    ...growthSection(profile, growths, now),
    '',
  ]
  const footer = ['说明:参考线为 WHO 标准,仅供日常参考,临床判断以儿保医生为准。']
  return [...header, ...h24, ...d7, ...footer].join('\n')
}

// 重新导出方便 UI 层取用
export { sleepMinutes }
