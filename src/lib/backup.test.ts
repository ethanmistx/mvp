import { describe, expect, it } from 'vitest'
import { parseBundle } from './backup'

const validBundle = {
  schemaVersion: 2,
  exportedAt: '2026-06-11T00:00:00.000Z',
  profile: { id: 'p1', name: '糖糖', birthDate: '2025-12-10', sex: 'girl' },
  feeds: [{ id: 'f1', ts: '2026-06-10T06:00:00.000Z', type: 'formula', amountMl: 120 }],
  sleeps: [{ id: 's1', start: '2026-06-09T22:00:00.000Z', end: null }],
  growths: [{ id: 'g1', date: '2026-06-01', weightKg: 7.2 }],
  diapers: [{ id: 'd1', ts: '2026-06-10T08:00:00.000Z', kind: 'wet' }],
  temperatures: [{ id: 't1', ts: '2026-06-10T09:00:00.000Z', celsius: 38.2, site: 'ear' }],
  medCourses: [
    { id: 'c1', name: '头孢克肟', timesPerDay: 3, startDate: '2026-06-08', endDate: '2026-06-14' },
  ],
  medDoses: [{ id: 'm1', courseId: 'c1', ts: '2026-06-10T08:30:00.000Z' }],
}

describe('parseBundle(导入前校验)', () => {
  it('合法 v2 备份通过并原样返回', () => {
    const r = parseBundle(JSON.stringify(validBundle))
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.bundle.feeds).toHaveLength(1)
      expect(r.bundle.sleeps[0].end).toBeNull()
      expect(r.bundle.temperatures).toHaveLength(1)
      expect(r.bundle.medCourses[0].name).toBe('头孢克肟')
    }
  })

  it('v1 旧备份(无健康集合)自动迁移:补空数组并归一化为 v2', () => {
    const { temperatures: _t, medCourses: _c, medDoses: _d, ...v1 } = validBundle
    const r = parseBundle(JSON.stringify({ ...v1, schemaVersion: 1 }))
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.bundle.schemaVersion).toBe(2)
      expect(r.bundle.temperatures).toEqual([])
      expect(r.bundle.medCourses).toEqual([])
      expect(r.bundle.medDoses).toEqual([])
      expect(r.bundle.feeds).toHaveLength(1)
    }
  })

  it('v2 备份中健康记录字段不对被拦下', () => {
    const bad = { ...validBundle, temperatures: [{ id: 't1', ts: '2026-06-10', celsius: '38' }] }
    const r = parseBundle(JSON.stringify(bad))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toContain('temperatures')
  })

  it('非 JSON / 非对象 / 版本不符均给中文原因', () => {
    expect(parseBundle('{oops')).toMatchObject({ ok: false })
    expect(parseBundle('"just a string"')).toMatchObject({ ok: false })
    const r = parseBundle(JSON.stringify({ ...validBundle, schemaVersion: 3 }))
    expect(r).toMatchObject({ ok: false })
    if (!r.ok) expect(r.reason).toContain('版本')
  })

  it('缺少某个数组(曾导致清库后事务崩溃)被拦下', () => {
    const { sleeps: _omitted, ...noSleeps } = validBundle
    const r = parseBundle(JSON.stringify(noSleeps))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toContain('sleeps')
  })

  it('记录缺 id 或字段类型不对被拦下,并指出第几条', () => {
    const bad = { ...validBundle, feeds: [validBundle.feeds[0], { ts: 123, type: 'formula' }] }
    const r = parseBundle(JSON.stringify(bad))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toContain('第 2 条')
  })

  it('profile 为 null 合法;profile 缺字段被拦下', () => {
    expect(parseBundle(JSON.stringify({ ...validBundle, profile: null })).ok).toBe(true)
    const r = parseBundle(JSON.stringify({ ...validBundle, profile: { id: 'p1' } }))
    expect(r.ok).toBe(false)
  })
})
