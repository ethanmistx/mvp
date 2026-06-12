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

// ---------- 健康模块(v2 新增):通用设计,不绑定具体疾病 ----------

export type TempSite = 'armpit' | 'ear' | 'forehead' | 'rectal'

export interface Temperature {
  id: string
  /** ISO datetime */
  ts: string
  celsius: number
  site?: TempSite
  /** 本次测温前后是否用了退烧药(仅记录事实,不做判断) */
  antipyretic?: boolean
  note?: string
}

/** 用药疗程(如抗生素 7 天、每日 3 次);打卡记录见 MedDose */
export interface MedCourse {
  id: string
  name: string
  timesPerDay: number
  /** ISO date,含当天 */
  startDate: string
  /** ISO date,含当天 */
  endDate: string
  /** 剂量等备注,如「2.5ml/次」 */
  note?: string
}

/** 一次实际服药打卡 */
export interface MedDose {
  id: string
  courseId: string
  /** ISO datetime */
  ts: string
}

/** 导出 / 导入的完整数据包(v2 新增健康集合;v1 备份导入时自动补空) */
export interface ExportBundle {
  schemaVersion: 2
  exportedAt: string
  profile: BabyProfile | null
  feeds: Feed[]
  sleeps: Sleep[]
  growths: Growth[]
  diapers: Diaper[]
  temperatures: Temperature[]
  medCourses: MedCourse[]
  medDoses: MedDose[]
}
