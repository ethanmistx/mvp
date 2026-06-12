// 中文文案集中管理,UI 与摘要共用
import type { DiaperKind, FeedType, TempSite } from '../types'

export const tempSiteLabels: Record<TempSite, string> = {
  armpit: '腋下',
  ear: '耳温',
  forehead: '额温',
  rectal: '肛温',
}

export const feedTypeLabels: Record<FeedType, string> = {
  nurse: '亲喂',
  bottleBreast: '瓶喂母乳',
  formula: '配方奶',
  solid: '辅食',
}

export const diaperKindLabels: Record<DiaperKind, string> = {
  wet: '尿湿',
  dirty: '便便',
  mixed: '混合',
}

export const feedTypeIcons: Record<FeedType, string> = {
  nurse: '🤱',
  bottleBreast: '🍼',
  formula: '🥛',
  solid: '🥣',
}

export const diaperKindIcons: Record<DiaperKind, string> = {
  wet: '💧',
  dirty: '💩',
  mixed: '💧💩',
}

/** 红线:生长曲线页固定免责声明 */
export const GROWTH_DISCLAIMER = '参考线为 WHO 标准,仅供日常参考,临床判断以儿保医生为准'
