import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { DexieAdapter } from './dexieAdapter'
import type { ExportBundle, Feed } from '../types'

const emptyBundle = (): ExportBundle => ({
  schemaVersion: 2,
  exportedAt: new Date().toISOString(),
  profile: null,
  feeds: [],
  sleeps: [],
  growths: [],
  diapers: [],
  temperatures: [],
  medCourses: [],
  medDoses: [],
})

describe('DexieAdapter', () => {
  let adapter: DexieAdapter

  beforeEach(async () => {
    adapter = new DexieAdapter()
    // 每个用例从空库开始
    await adapter.importAll(emptyBundle())
  })

  it('put/get/list/delete 闭环', async () => {
    const feed: Feed = { id: 'f1', ts: '2026-06-10T06:00:00.000Z', type: 'formula', amountMl: 120 }
    await adapter.put('feeds', feed)
    expect(await adapter.get<Feed>('feeds', 'f1')).toEqual(feed)
    expect(await adapter.list<Feed>('feeds')).toHaveLength(1)

    await adapter.put('feeds', { ...feed, amountMl: 150 }) // upsert 更新
    expect((await adapter.get<Feed>('feeds', 'f1'))?.amountMl).toBe(150)

    await adapter.delete('feeds', 'f1')
    expect(await adapter.get('feeds', 'f1')).toBeUndefined()
  })

  it('exportAll → importAll 完整往返(含 v2 健康集合)', async () => {
    await adapter.put('profile', { id: 'p1', name: '小宝', birthDate: '2026-01-01', sex: 'boy' })
    await adapter.put('feeds', { id: 'f1', ts: '2026-06-10T06:00:00.000Z', type: 'nurse', minutes: 10 })
    await adapter.put('sleeps', { id: 's1', start: '2026-06-09T22:00:00.000Z', end: null })
    await adapter.put('growths', { id: 'g1', date: '2026-06-01', weightKg: 7.2 })
    await adapter.put('diapers', { id: 'd1', ts: '2026-06-10T08:00:00.000Z', kind: 'wet' })
    await adapter.put('temperatures', { id: 't1', ts: '2026-06-10T09:00:00.000Z', celsius: 38.2, site: 'ear' })
    await adapter.put('medCourses', {
      id: 'c1',
      name: '头孢克肟',
      timesPerDay: 3,
      startDate: '2026-06-08',
      endDate: '2026-06-14',
    })
    await adapter.put('medDoses', { id: 'm1', courseId: 'c1', ts: '2026-06-10T08:30:00.000Z' })

    const bundle = await adapter.exportAll()
    expect(bundle.schemaVersion).toBe(2)
    expect(bundle.profile?.name).toBe('小宝')
    expect(bundle.temperatures).toHaveLength(1)

    // 清空(导入空包)后再导入,数据应完整还原
    await adapter.importAll(emptyBundle())
    expect(await adapter.list('feeds')).toHaveLength(0)
    expect(await adapter.list('medDoses')).toHaveLength(0)

    await adapter.importAll(bundle)
    const restored = await adapter.exportAll()
    expect(restored.profile).toEqual(bundle.profile)
    expect(restored.feeds).toEqual(bundle.feeds)
    expect(restored.sleeps).toEqual(bundle.sleeps)
    expect(restored.growths).toEqual(bundle.growths)
    expect(restored.diapers).toEqual(bundle.diapers)
    expect(restored.temperatures).toEqual(bundle.temperatures)
    expect(restored.medCourses).toEqual(bundle.medCourses)
    expect(restored.medDoses).toEqual(bundle.medDoses)
  })
})
