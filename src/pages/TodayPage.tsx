import { useMemo } from 'react'
import type { BabyProfile, Diaper, Feed, Growth, MedDose, Sleep, Temperature } from '../types'
import { useCollection, useNow } from '../hooks/useStore'
import { dayOfLife, monthsAndDays, streakDays } from '../lib/dates'
import { collectRecordDays } from '../lib/stats'
import { FeedSection } from '../components/FeedSection'
import { SleepSection } from '../components/SleepSection'
import { DiaperSection } from '../components/DiaperSection'
import { HealthSection } from '../components/HealthSection'

export function TodayPage({ profile }: { profile: BabyProfile }) {
  const now = useNow(60_000)
  const { items: feeds } = useCollection<Feed>('feeds')
  const { items: sleeps } = useCollection<Sleep>('sleeps')
  const { items: diapers } = useCollection<Diaper>('diapers')
  const { items: growths } = useCollection<Growth>('growths')
  const { items: temps } = useCollection<Temperature>('temperatures')
  const { items: doses } = useCollection<MedDose>('medDoses')

  const { months, days } = monthsAndDays(profile.birthDate, now)
  const streak = useMemo(() => {
    const recordDays = collectRecordDays(
      feeds ?? [],
      sleeps ?? [],
      diapers ?? [],
      (growths ?? []).map((g) => g.date),
      [...(temps ?? []).map((t) => t.ts), ...(doses ?? []).map((d) => d.ts)],
    )
    return streakDays(recordDays, now)
  }, [feeds, sleeps, diapers, growths, temps, doses, now])

  return (
    <div className="page">
      <header className="px-1 pt-2">
        <h1 className="text-xl font-bold">{profile.name}</h1>
        <p className="text-night-dim text-sm mt-0.5">
          出生第 {dayOfLife(profile.birthDate, now)} 天 · {months} 个月 {days} 天
        </p>
        {streak > 0 && (
          <p className="inline-flex items-center gap-1 mt-2 text-warm text-xs bg-warm/10 rounded-full px-2.5 py-1">
            🔥 已连续记录 {streak} 天
          </p>
        )}
      </header>
      <FeedSection />
      <SleepSection />
      <DiaperSection />
      <HealthSection />
    </div>
  )
}
