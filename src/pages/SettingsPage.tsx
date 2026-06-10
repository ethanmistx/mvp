import type { BabyProfile } from '../types'

export function SettingsPage({ profile }: { profile: BabyProfile }) {
  void profile
  return <div className="p-4 pb-24">设置(下一阶段实现)</div>
}
