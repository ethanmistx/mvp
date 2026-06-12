// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { getResolvedTheme, initTheme, loadThemePref, setThemePref } from './theme'

describe('主题管理', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('light')
    const meta = document.createElement('meta')
    meta.name = 'theme-color'
    meta.content = '#1c1917'
    document.head.querySelector('meta[name="theme-color"]')?.remove()
    document.head.appendChild(meta)
  })

  it('默认深色;偏好持久化并能读回', () => {
    initTheme()
    expect(loadThemePref()).toBe('dark')
    expect(getResolvedTheme()).toBe('dark')
    expect(document.documentElement.classList.contains('light')).toBe(false)

    setThemePref('light')
    expect(loadThemePref()).toBe('light')
    expect(document.documentElement.classList.contains('light')).toBe(true)
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#fafaf9')

    setThemePref('dark')
    expect(document.documentElement.classList.contains('light')).toBe(false)
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#1c1917')
  })

  it('损坏/未知的存储值回退到深色', () => {
    localStorage.setItem('theme-v1', 'neon')
    expect(loadThemePref()).toBe('dark')
  })

  it('system 在无 matchMedia 环境(jsdom)解析为深色,不抛错', () => {
    setThemePref('system')
    expect(getResolvedTheme()).toBe('dark')
  })
})
