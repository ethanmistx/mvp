import Dexie, { type Table } from 'dexie'
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
import type { CollectionName, StorageAdapter } from './StorageAdapter'

class BabyDB extends Dexie {
  profile!: Table<BabyProfile, string>
  feeds!: Table<Feed, string>
  sleeps!: Table<Sleep, string>
  growths!: Table<Growth, string>
  diapers!: Table<Diaper, string>
  temperatures!: Table<Temperature, string>
  medCourses!: Table<MedCourse, string>
  medDoses!: Table<MedDose, string>

  constructor() {
    super('baby-growth-mvp')
    this.version(1).stores({
      profile: 'id',
      feeds: 'id, ts',
      sleeps: 'id, start',
      growths: 'id, date',
      diapers: 'id, ts',
    })
    // v2:健康模块(体温/用药疗程/服药打卡),老库自动升级
    this.version(2).stores({
      temperatures: 'id, ts',
      medCourses: 'id, startDate',
      medDoses: 'id, ts, courseId',
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

  private allTables() {
    return [
      this.db.profile,
      this.db.feeds,
      this.db.sleeps,
      this.db.growths,
      this.db.diapers,
      this.db.temperatures,
      this.db.medCourses,
      this.db.medDoses,
    ]
  }

  async exportAll(): Promise<ExportBundle> {
    const [profiles, feeds, sleeps, growths, diapers, temperatures, medCourses, medDoses] =
      await Promise.all([
        this.db.profile.toArray(),
        this.db.feeds.toArray(),
        this.db.sleeps.toArray(),
        this.db.growths.toArray(),
        this.db.diapers.toArray(),
        this.db.temperatures.toArray(),
        this.db.medCourses.toArray(),
        this.db.medDoses.toArray(),
      ])
    return {
      schemaVersion: 2,
      exportedAt: new Date().toISOString(),
      profile: profiles[0] ?? null,
      feeds,
      sleeps,
      growths,
      diapers,
      temperatures,
      medCourses,
      medDoses,
    }
  }

  async importAll(bundle: ExportBundle): Promise<void> {
    await this.db.transaction('rw', this.allTables(), async () => {
      await Promise.all(this.allTables().map((t) => t.clear()))
      if (bundle.profile) await this.db.profile.put(bundle.profile)
      await this.db.feeds.bulkPut(bundle.feeds)
      await this.db.sleeps.bulkPut(bundle.sleeps)
      await this.db.growths.bulkPut(bundle.growths)
      await this.db.diapers.bulkPut(bundle.diapers)
      await this.db.temperatures.bulkPut(bundle.temperatures)
      await this.db.medCourses.bulkPut(bundle.medCourses)
      await this.db.medDoses.bulkPut(bundle.medDoses)
    })
  }
}
