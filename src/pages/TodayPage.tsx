import { useMemo } from 'react'
import type { BabyProfile, Diaper, Feed, Growth, Sleep } from '../types'
import { useCollection, useNow } from '../hooks/useStore'
import { dayOfLife, monthsAndDays, streakDays } from '../lib/dates'
import { collectRecordDays } from '../lib/stats'
import { FeedSection } from '../components/FeedSection'
import { SleepSection } from '../components/SleepSection'
import { DiaperSection } from '../components/DiaperSection'

export function TodayPage({ profile }: { profile: BabyProfile }) {
  const now = useNow(60_000)
  const { items: feeds } = useCollection<Feed>('feeds')
  const { items: sleeps } = useCollection<Sleep>('sleeps')
  const { items: diapers } = useCollection<Diaper>('diapers')
  const { items: growths } = useCollection<Growth>('growths')

  const { months, days } = monthsAndDays(profile.birthDate, now)
  const streak = useMemo(() => {
    const recordDays = collectRecordDays(
      feeds ?? [],
      sleeps ?? [],
      diapers ?? [],
      (growths ?? []).map((g) => g.date),
    )
    return streakDays(recordDays, now)
  }, [feeds, sleeps, diapers, growths, now])

  return (
    <div className="p-4 space-y-3 pb-24">
      <header className="px-1 pt-2">
        <h1 className="text-xl font-bold">{profile.name}</h1>
        <p className="text-night-dim text-sm mt-0.5">
          出生第 {dayOfLife(profile.birthDate, now)} 天 · {months} 个月 {days} 天
        </p>
        {streak > 0 && (
          <p className="text-warm text-sm mt-1.5">🔥 已连续记录 {streak} 天</p>
        )}
      </header>
      <FeedSection />
      <SleepSection />
      <DiaperSection />
    </div>
  )
}
