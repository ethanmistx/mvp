import type { StorageAdapter } from './StorageAdapter'
import { DexieAdapter } from './dexieAdapter'

// 全局唯一存储实例;Phase 1 若引入远端同步,只需在这里替换实现。
export const storage: StorageAdapter = new DexieAdapter()

export type { StorageAdapter, CollectionName } from './StorageAdapter'
