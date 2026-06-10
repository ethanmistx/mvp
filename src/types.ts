// 数据模型(Phase 0 schema,字段 camelCase)
// 注意:此处的类型即导出 JSON 的 schema,Phase 1 的 LLM 摘要 / 后端同步均以此为契约。

export type Sex = 'boy' | 'girl'

export interface BabyProfile {
  id: string
  name: string
  /** ISO date,如 2025-11-03 */
  birthDate: string
  sex: Sex
}

export type FeedType = 'nurse' | 'bottleBreast' | 'formula' | 'solid'

export interface Feed {
  id: string
  /** ISO datetime */
  ts: string
  type: FeedType
  /** 瓶喂母乳 / 配方奶的奶量 */
  amountMl?: number
  /** 亲喂时长 */
  minutes?: number
  note?: string
}

export interface Sleep {
  id: string
  /** ISO datetime */
  start: string
  /** ISO datetime;null 表示进行中 */
  end: string | null
}

export interface Growth {
  id: string
  /** ISO date */
  date: string
  weightKg?: number
  lengthCm?: number
  headCm?: number
}

export type DiaperKind = 'wet' | 'dirty' | 'mixed'

export interface Diaper {
  id: string
  /** ISO datetime */
  ts: string
  kind: DiaperKind
  note?: string
}

/** 导出 / 导入的完整数据包 */
export interface ExportBundle {
  schemaVersion: 1
  exportedAt: string
  profile: BabyProfile | null
  feeds: Feed[]
  sleeps: Sleep[]
  growths: Growth[]
  diapers: Diaper[]
}
