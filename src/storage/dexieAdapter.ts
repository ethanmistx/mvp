import Dexie, { type Table } from 'dexie'
import type { BabyProfile, Diaper, ExportBundle, Feed, Growth, Sleep } from '../types'
import type { CollectionName, StorageAdapter } from './StorageAdapter'

class BabyDB extends Dexie {
  profile!: Table<BabyProfile, string>
  feeds!: Table<Feed, string>
  sleeps!: Table<Sleep, string>
  growths!: Table<Growth, string>
  diapers!: Table<Diaper, string>

  constructor() {
    super('baby-growth-mvp')
    this.version(1).stores({
      profile: 'id',
      feeds: 'id, ts',
      sleeps: 'id, start',
      growths: 'id, date',
      diapers: 'id, ts',
    })
  }
}

export class DexieAdapter implements StorageAdapter {
  private db = new BabyDB()

  private table(collection: CollectionName): Table<{ id: string }, string> {
    return this.db[collection] as Table<{ id: string }, string>
  }

  async get<T>(collection: CollectionName, id: string): Promise<T | undefined> {
    return (await this.table(collection).get(id)) as T | undefined
  }

  async put<T extends { id: string }>(collection: CollectionName, value: T): Promise<void> {
    await this.table(collection).put(value)
  }

  async delete(collection: CollectionName, id: string): Promise<void> {
    await this.table(collection).delete(id)
  }

  async list<T>(collection: CollectionName): Promise<T[]> {
    return (await this.table(collection).toArray()) as T[]
  }

  async exportAll(): Promise<ExportBundle> {
    const [profiles, feeds, sleeps, growths, diapers] = await Promise.all([
      this.db.profile.toArray(),
      this.db.feeds.toArray(),
      this.db.sleeps.toArray(),
      this.db.growths.toArray(),
      this.db.diapers.toArray(),
    ])
    return {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      profile: profiles[0] ?? null,
      feeds,
      sleeps,
      growths,
      diapers,
    }
  }

  async importAll(bundle: ExportBundle): Promise<void> {
    await this.db.transaction(
      'rw',
      [this.db.profile, this.db.feeds, this.db.sleeps, this.db.growths, this.db.diapers],
      async () => {
        await Promise.all([
          this.db.profile.clear(),
          this.db.feeds.clear(),
          this.db.sleeps.clear(),
          this.db.growths.clear(),
          this.db.diapers.clear(),
        ])
        if (bundle.profile) await this.db.profile.put(bundle.profile)
        await this.db.feeds.bulkPut(bundle.feeds)
        await this.db.sleeps.bulkPut(bundle.sleeps)
        await this.db.growths.bulkPut(bundle.growths)
        await this.db.diapers.bulkPut(bundle.diapers)
      },
    )
  }
}
