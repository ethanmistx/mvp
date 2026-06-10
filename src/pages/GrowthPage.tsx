import type { BabyProfile } from '../types'

export function GrowthPage({ profile }: { profile: BabyProfile }) {
  void profile
  return <div className="p-4 pb-24">生长曲线(下一阶段实现)</div>
}
