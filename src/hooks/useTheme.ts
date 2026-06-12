import { useSyncExternalStore } from 'react'
import {
  getResolvedTheme,
  getThemePref,
  setThemePref,
  subscribeTheme,
  type ThemePref,
} from '../lib/theme'

/** 主题偏好(设置页用) */
export function useThemePref(): [ThemePref, (p: ThemePref) => void] {
  const pref = useSyncExternalStore(subscribeTheme, getThemePref)
  return [pref, setThemePref]
}

/** 实际生效的主题(图表等需要具体色值的场景用) */
export function useResolvedTheme(): 'dark' | 'light' {
  return useSyncExternalStore(subscribeTheme, getResolvedTheme)
}
