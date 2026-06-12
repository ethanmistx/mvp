// 主题管理:深色(默认)/ 浅色 / 跟随系统。
// 偏好存 localStorage;应用方式是切换 <html class="light"> + 同步 theme-color meta,
// 颜色本身由 src/index.css 的 CSS 变量两套定义驱动,组件无需感知主题。

export type ThemePref = 'dark' | 'light' | 'system'

const KEY = 'theme-v1'
const META_COLORS = { dark: '#1c1917', light: '#fafaf9' } as const

let pref: ThemePref = 'dark'
const listeners = new Set<() => void>()

export function loadThemePref(): ThemePref {
  try {
    const raw = localStorage.getItem(KEY)
    return raw === 'light' || raw === 'system' || raw === 'dark' ? raw : 'dark'
  } catch {
    return 'dark'
  }
}

export function getThemePref(): ThemePref {
  return pref
}

/** 当前实际生效的主题(把 system 解析成 dark/light) */
export function getResolvedTheme(): 'dark' | 'light' {
  if (pref !== 'system') return pref
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  }
  return 'dark'
}

function apply(): void {
  const resolved = getResolvedTheme()
  document.documentElement.classList.toggle('light', resolved === 'light')
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', META_COLORS[resolved])
}

export function setThemePref(p: ThemePref): void {
  pref = p
  try {
    localStorage.setItem(KEY, p)
  } catch {
    // 隐私模式等场景存不进去,本次会话内仍生效
  }
  apply()
  listeners.forEach((fn) => fn())
}

export function subscribeTheme(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** 启动时调用一次;跟随系统时监听系统切换 */
export function initTheme(): void {
  pref = loadThemePref()
  apply()
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
      if (pref === 'system') {
        apply()
        listeners.forEach((fn) => fn())
      }
    })
  }
}
