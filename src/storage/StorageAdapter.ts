import type { ExportBundle } from '../types'

/**
 * 统一存储接口:UI 与 hooks 只依赖此接口,不直接触碰 Dexie。
 * Phase 0 由 DexieAdapter(IndexedDB)实现;未来可换 REST / 同步实现而不改 UI。
 */
export type CollectionName =
  | 'profile'
  | 'feeds'
  | 'sleeps'
  | 'growths'
  | 'diapers'
  | 'temperatures'
  | 'medCourses'
  | 'medDoses'

export interface StorageAdapter {
  get<T>(collection: CollectionName, id: string): Promise<T | undefined>
  /** 新增或更新(按 id upsert) */
  put<T extends { id: string }>(collection: CollectionName, value: T): Promise<void>
  delete(collection: CollectionName, id: string): Promise<void>
  list<T>(collection: CollectionName): Promise<T[]>
  exportAll(): Promise<ExportBundle>
  /** 整体导入:清空后还原,用于备份恢复 */
  importAll(bundle: ExportBundle): Promise<void>
}
