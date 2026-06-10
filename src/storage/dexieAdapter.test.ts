import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { DexieAdapter } from './dexieAdapter'
import type { ExportBundle, Feed } from '../types'

describe('DexieAdapter', () => {
  let adapter: DexieAdapter

  beforeEach(async () => {
    adapter = new DexieAdapter()
    // 每个用例从空库开始
    await adapter.importAll({
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      profile: null,
      feeds: [],
      sleeps: [],
      growths: [],
      diapers: [],
    })
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

  it('exportAll → importAll 完整往返(清空后还原)', async () => {
    await adapter.put('profile', { id: 'p1', name: '小宝', birthDate: '2026-01-01', sex: 'boy' })
    await adapter.put('feeds', { id: 'f1', ts: '2026-06-10T06:00:00.000Z', type: 'nurse', minutes: 10 })
    await adapter.put('sleeps', { id: 's1', start: '2026-06-09T22:00:00.000Z', end: null })
    await adapter.put('growths', { id: 'g1', date: '2026-06-01', weightKg: 7.2 })
    await adapter.put('diapers', { id: 'd1', ts: '2026-06-10T08:00:00.000Z', kind: 'wet' })

    const bundle = await adapter.exportAll()
    expect(bundle.schemaVersion).toBe(1)
    expect(bundle.profile?.name).toBe('小宝')

    // 清空(导入空包)后再导入,数据应完整还原
    const empty: ExportBundle = { ...bundle, profile: null, feeds: [], sleeps: [], growths: [], diapers: [] }
    await adapter.importAll(empty)
    expect(await adapter.list('feeds')).toHaveLength(0)

    await adapter.importAll(bundle)
    const restored = await adapter.exportAll()
    expect(restored.profile).toEqual(bundle.profile)
    expect(restored.feeds).toEqual(bundle.feeds)
    expect(restored.sleeps).toEqual(bundle.sleeps)
    expect(restored.growths).toEqual(bundle.growths)
    expect(restored.diapers).toEqual(bundle.diapers)
  })
})
