// 页面级 UI 状态的会话内记忆(切换 tab 会卸载页面组件,这里保住浏览位置等轻状态)。
// 刻意不进 localStorage:下次冷启动回到默认即可。
import type { Metric } from './who'

export const pageMemory: {
  historyDaysShown: number
  growthMetric: Metric
} = {
  historyDaysShown: 14,
  growthMetric: 'weightKg',
}
