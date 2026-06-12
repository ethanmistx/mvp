// 备份 JSON 的解析与校验:在清空数据库之前把关,而不是事后靠事务回滚兜底。
// 校验失败返回中文原因,UI 直接展示。
// 兼容 v1(无健康集合)与 v2;统一归一化为 v2 返回。

import type {
  BabyProfile,
  Diaper,
  ExportBundle,
  Feed,
  Growth,
  MedCourse,
  MedDose,
  Sleep,
  Temperature,
} from '../types'

export type ParseResult = { ok: true; bundle: ExportBundle } | { ok: false; reason: string }

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function hasId(v: unknown): v is { id: string } {
  return isRecord(v) && typeof v.id === 'string' && v.id !== ''
}

function isValidProfile(v: unknown): v is BabyProfile {
  return (
    hasId(v) &&
    typeof (v as BabyProfile).name === 'string' &&
    typeof (v as BabyProfile).birthDate === 'string' &&
    ((v as BabyProfile).sex === 'boy' || (v as BabyProfile).sex === 'girl')
  )
}

function isValidFeed(v: unknown): v is Feed {
  return hasId(v) && typeof (v as Feed).ts === 'string' && typeof (v as Feed).type === 'string'
}

function isValidSleep(v: unknown): v is Sleep {
  if (!hasId(v)) return false
  const s = v as Sleep
  return typeof s.start === 'string' && (s.end === null || typeof s.end === 'string')
}

function isValidGrowth(v: unknown): v is Growth {
  return hasId(v) && typeof (v as Growth).date === 'string'
}

function isValidDiaper(v: unknown): v is Diaper {
  return hasId(v) && typeof (v as Diaper).ts === 'string' && typeof (v as Diaper).kind === 'string'
}

function isValidTemperature(v: unknown): v is Temperature {
  return (
    hasId(v) &&
    typeof (v as Temperature).ts === 'string' &&
    typeof (v as Temperature).celsius === 'number' &&
    Number.isFinite((v as Temperature).celsius)
  )
}

function isValidMedCourse(v: unknown): v is MedCourse {
  const c = v as MedCourse
  return (
    hasId(v) &&
    typeof c.name === 'string' &&
    typeof c.timesPerDay === 'number' &&
    typeof c.startDate === 'string' &&
    typeof c.endDate === 'string'
  )
}

function isValidMedDose(v: unknown): v is MedDose {
  const d = v as MedDose
  return hasId(v) && typeof d.courseId === 'string' && typeof d.ts === 'string'
}

function checkArray<T>(
  raw: unknown,
  label: string,
  isValid: (v: unknown) => v is T,
): { ok: true; list: T[] } | { ok: false; reason: string } {
  if (!Array.isArray(raw)) return { ok: false, reason: `缺少 ${label} 数组,不是本应用导出的备份。` }
  for (let i = 0; i < raw.length; i++) {
    if (!isValid(raw[i])) return { ok: false, reason: `${label} 第 ${i + 1} 条记录格式不正确。` }
  }
  return { ok: true, list: raw as T[] }
}

export function parseBundle(text: string): ParseResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, reason: '无法解析该文件,请确认是本应用导出的 JSON 备份。' }
  }
  if (!isRecord(parsed)) return { ok: false, reason: '文件内容不是有效的备份对象。' }
  if (parsed.schemaVersion !== 1 && parsed.schemaVersion !== 2) {
    return { ok: false, reason: '备份版本不受支持(需要 schemaVersion 1 或 2)。' }
  }
  const isV1 = parsed.schemaVersion === 1
  if (parsed.profile !== null && !isValidProfile(parsed.profile)) {
    return { ok: false, reason: '宝宝档案字段不完整。' }
  }
  const feeds = checkArray(parsed.feeds, '喂养(feeds)', isValidFeed)
  if (!feeds.ok) return feeds
  const sleeps = checkArray(parsed.sleeps, '睡眠(sleeps)', isValidSleep)
  if (!sleeps.ok) return sleeps
  const growths = checkArray(parsed.growths, '生长(growths)', isValidGrowth)
  if (!growths.ok) return growths
  const diapers = checkArray(parsed.diapers, '尿布(diapers)', isValidDiaper)
  if (!diapers.ok) return diapers
  // v1 → v2 迁移:健康集合补空
  const temperatures = checkArray(isV1 ? [] : parsed.temperatures, '体温(temperatures)', isValidTemperature)
  if (!temperatures.ok) return temperatures
  const medCourses = checkArray(isV1 ? [] : parsed.medCourses, '疗程(medCourses)', isValidMedCourse)
  if (!medCourses.ok) return medCourses
  const medDoses = checkArray(isV1 ? [] : parsed.medDoses, '服药(medDoses)', isValidMedDose)
  if (!medDoses.ok) return medDoses

  return {
    ok: true,
    bundle: {
      schemaVersion: 2,
      exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : '',
      profile: (parsed.profile as BabyProfile | null) ?? null,
      feeds: feeds.list,
      sleeps: sleeps.list,
      growths: growths.list,
      diapers: diapers.list,
      temperatures: temperatures.list,
      medCourses: medCourses.list,
      medDoses: medDoses.list,
    },
  }
}
