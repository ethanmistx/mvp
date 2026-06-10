// 日期与月龄计算的纯函数集合,全部可单测。
// 约定:`ISO date` 指 YYYY-MM-DD(本地日历日),`ISO datetime` 指完整时间戳。

const DAY_MS = 24 * 60 * 60 * 1000

/** 取本地日历日字符串 YYYY-MM-DD */
export function localDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 解析 YYYY-MM-DD 为本地零点 Date */
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** 当天本地零点 */
export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/**
 * 出生第 N 天:出生当天为第 1 天(按本地日历日计)。
 */
export function dayOfLife(birthDate: string, now: Date): number {
  const birth = parseLocalDate(birthDate)
  const today = startOfDay(now)
  return Math.round((today.getTime() - birth.getTime()) / DAY_MS) + 1
}

/**
 * 「X 个月 Y 天」:按日历月推进(医学上常用的实足月龄算法)。
 * 例:11-30 出生,12-30 即满 1 个月;若目标月没有同号日,则取该月最后一天为满月日。
 */
export function monthsAndDays(birthDate: string, now: Date): { months: number; days: number } {
  const birth = parseLocalDate(birthDate)
  const today = startOfDay(now)
  if (today.getTime() < birth.getTime()) return { months: 0, days: 0 }

  let months =
    (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth())
  // 锚点:出生日 + months 个月(JS Date 对溢出自动顺延,这里手动钳到月末)
  let anchor = addCalendarMonths(birth, months)
  if (anchor.getTime() > today.getTime()) {
    months -= 1
    anchor = addCalendarMonths(birth, months)
  }
  const days = Math.round((today.getTime() - anchor.getTime()) / DAY_MS)
  return { months, days }
}

/** 出生日 + n 个日历月;若该月无同号日(如 1-31 → 2 月),钳到该月最后一天 */
export function addCalendarMonths(birth: Date, n: number): Date {
  const y = birth.getFullYear()
  const m = birth.getMonth() + n
  const lastDay = new Date(y, m + 1, 0).getDate()
  return new Date(y, m, Math.min(birth.getDate(), lastDay))
}

/**
 * 精确月龄(用于生长曲线 x 轴):天数 / 30.4375(WHO 标准中 1 月 = 365.25/12 天)。
 */
export function ageInMonths(birthDate: string, onDate: string): number {
  const birth = parseLocalDate(birthDate)
  const target = parseLocalDate(onDate)
  const days = (target.getTime() - birth.getTime()) / DAY_MS
  return days / 30.4375
}

/** 某 ISO datetime 是否落在 now 所在的本地日历日 */
export function isSameLocalDay(iso: string, now: Date): boolean {
  return localDateStr(new Date(iso)) === localDateStr(now)
}

/**
 * 跨夜睡眠归属:整段睡眠归属于「入睡那一天」。
 * 返回该睡眠段所属的本地日历日 YYYY-MM-DD。
 */
export function sleepBelongsToDay(startIso: string): string {
  return localDateStr(new Date(startIso))
}

/** 睡眠时长(分钟);进行中按 now 计 */
export function sleepMinutes(startIso: string, endIso: string | null, now: Date): number {
  const start = new Date(startIso).getTime()
  const end = endIso ? new Date(endIso).getTime() : now.getTime()
  return Math.max(0, Math.round((end - start) / 60000))
}

/**
 * 连续记录天数:从今天(或昨天)往前数,有任意一条记录的日子算记录日。
 * 今天还没记录时不打断连续(从昨天起算),鼓励而非惩罚。
 */
export function streakDays(recordDays: Set<string>, now: Date): number {
  let cursor = startOfDay(now)
  if (!recordDays.has(localDateStr(cursor))) {
    cursor = new Date(cursor.getTime() - DAY_MS)
  }
  let streak = 0
  while (recordDays.has(localDateStr(cursor))) {
    streak += 1
    cursor = new Date(cursor.getTime() - DAY_MS)
  }
  return streak
}

/** 把分钟数格式化为「X 小时 Y 分」 */
export function formatMinutes(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m} 分钟`
  if (m === 0) return `${h} 小时`
  return `${h} 小时 ${m} 分`
}

/** 距现在的相对时间文案,如「35 分钟前」「2 小时前」 */
export function timeAgo(iso: string, now: Date): string {
  const diffMin = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60000))
  if (diffMin < 1) return '刚刚'
  if (diffMin < 60) return `${diffMin} 分钟前`
  const h = Math.floor(diffMin / 60)
  const m = diffMin % 60
  if (h < 24) return m > 0 ? `${h} 小时 ${m} 分前` : `${h} 小时前`
  return `${Math.floor(h / 24)} 天前`
}

/** HH:mm 显示 */
export function formatTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** 转成 <input type="datetime-local"> 需要的本地格式 */
export function toDatetimeLocal(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** datetime-local 值转回 ISO */
export function fromDatetimeLocal(value: string): string {
  return new Date(value).toISOString()
}
