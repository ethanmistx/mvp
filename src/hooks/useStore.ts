import { useCallback, useEffect, useState } from 'react'
import { storage, type CollectionName } from '../storage'
import type { BabyProfile } from '../types'

// 极简事件总线:任一集合写入后通知订阅的 hooks 重新拉取。
// 数据量在 Phase 0 规模(单机一年几千条)下全量重读完全够用。
type Listener = () => void
const listeners = new Map<CollectionName, Set<Listener>>()

function subscribe(collection: CollectionName, fn: Listener): () => void {
  if (!listeners.has(collection)) listeners.set(collection, new Set())
  listeners.get(collection)!.add(fn)
  return () => listeners.get(collection)!.delete(fn)
}

export function notify(collection: CollectionName): void {
  listeners.get(collection)?.forEach((fn) => fn())
}

const ALL_COLLECTIONS: CollectionName[] = [
  'profile',
  'feeds',
  'sleeps',
  'growths',
  'diapers',
  'temperatures',
  'medCourses',
  'medDoses',
]

/** 整体导入后全量刷新 */
export function notifyAll(): void {
  for (const name of ALL_COLLECTIONS) notify(name)
}

/** 订阅一个集合,返回数据与增删改方法 */
export function useCollection<T extends { id: string }>(collection: CollectionName) {
  const [items, setItems] = useState<T[] | null>(null)

  const reload = useCallback(() => {
    void storage.list<T>(collection).then(setItems)
  }, [collection])

  useEffect(() => {
    reload()
    return subscribe(collection, reload)
  }, [collection, reload])

  const put = useCallback(
    async (value: T) => {
      await storage.put(collection, value)
      notify(collection)
    },
    [collection],
  )

  const remove = useCallback(
    async (id: string) => {
      await storage.delete(collection, id)
      notify(collection)
    },
    [collection],
  )

  return { items, put, remove }
}

/** 宝宝档案(单条);undefined=加载中,null=尚未创建 */
export function useProfile() {
  const { items, put } = useCollection<BabyProfile>('profile')
  const profile = items === null ? undefined : (items[0] ?? null)
  return { profile, saveProfile: put }
}

/** 每分钟跳动一次的当前时间,驱动「距上次」「实时计时」等显示 */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}
