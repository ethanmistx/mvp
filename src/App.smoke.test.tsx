// @vitest-environment jsdom
// 端到端冒烟:引导建档 → 一键记录尿布 → 开始/结束睡眠 → 统计正确。
// 本环境无法下载真实浏览器(网络策略),用 jsdom + fake-indexeddb 替代。
import 'fake-indexeddb/auto'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'
import { storage } from './storage'
import { localDateStr } from './lib/dates'
import type { BabyProfile } from './types'

afterEach(cleanup)

// 用例之间不共享状态:需要档案的用例自己种入,而不是依赖前一个用例的引导流程
async function seedProfile(): Promise<void> {
  const profiles = await storage.list<BabyProfile>('profile')
  for (const p of profiles) await storage.delete('profile', p.id)
  await storage.put('profile', {
    id: 'test-profile',
    name: '小测',
    birthDate: localDateStr(new Date()),
    sex: 'boy',
  })
}

async function clearProfile(): Promise<void> {
  const profiles = await storage.list<BabyProfile>('profile')
  for (const p of profiles) await storage.delete('profile', p.id)
}

describe('App 冒烟', () => {
  it('完成引导后可一键记录尿布与睡眠,统计实时更新', async () => {
    await clearProfile()
    render(<App />)

    // 首次启动:引导页
    await screen.findByText('👋 欢迎')
    fireEvent.change(screen.getByPlaceholderText('如:糖糖'), { target: { value: '小测' } })
    fireEvent.click(screen.getByText('开始记录'))

    // 今日页:头部与三模块
    await screen.findByText('小测')
    expect(screen.getByText(/出生第 1 天/)).toBeTruthy()
    expect(screen.getByText('喂养')).toBeTruthy()
    expect(screen.getByText('睡眠')).toBeTruthy()
    expect(screen.getByText('换尿布')).toBeTruthy()

    // 一键记录尿湿
    fireEvent.click(screen.getByText('尿湿'))
    await screen.findByText(/今日 1 次\(💧1/)
    // 出现连续记录提示
    await screen.findByText(/已连续记录 1 天/)

    // 开始睡眠 → 进行中状态醒目 → 结束
    fireEvent.click(screen.getByText(/开始睡眠/))
    const sleeping = await screen.findByText(/睡眠中/)
    expect(sleeping).toBeTruthy()
    fireEvent.click(sleeping)
    await waitFor(() => expect(screen.queryByText(/睡眠中/)).toBeNull())

    // 记录页能看到两条记录,删除需二次确认
    fireEvent.click(screen.getByText('记录'))
    await screen.findByText(/尿布 · 尿湿/)
    expect(screen.getByText(/睡眠 /)).toBeTruthy()
    fireEvent.click(screen.getAllByLabelText('删除')[0])
    await screen.findByText('删除这条记录?')
    fireEvent.click(screen.getByText('取消'))
    await act(async () => {})
  })

  it('喂养弹层:点类型 → 保存,默认 120ml 与当前时间', async () => {
    await seedProfile()
    render(<App />)
    await screen.findByText('小测')
    fireEvent.click(screen.getByText('配方奶'))
    await screen.findByText('喂养记录')
    fireEvent.click(screen.getByText('保存'))
    await waitFor(() => expect(screen.queryByText('喂养记录')).toBeNull())
    await screen.findByText(/今日 1 次 · 120 ml/)
    expect(screen.getByText(/上次喂养:刚刚/)).toBeTruthy()
  })

  it('设置页:AI 解读配置区可用,服务商切换带入预设', async () => {
    await seedProfile()
    render(<App />)
    await screen.findByText('小测')
    fireEvent.click(screen.getByText('设置'))
    await screen.findByText(/AI 解读/)

    // 预设切换:Kimi → 接口地址自动填入 moonshot
    fireEvent.click(screen.getByText('Kimi'))
    const urlInput = screen.getByPlaceholderText('https://…') as HTMLInputElement
    expect(urlInput.value).toBe('https://api.moonshot.cn/v1')

    // AnyRouter → anthropic 网关地址
    fireEvent.click(screen.getByText('AnyRouter'))
    expect(urlInput.value).toBe('https://anyrouter.top')

    // 未填 Key 时「生成解读」禁用
    const genBtn = screen.getByText('生成解读') as HTMLButtonElement
    expect(genBtn.closest('button')!.disabled).toBe(true)

    // 外观切换:浅色 → html.light;切回深色复原
    fireEvent.click(screen.getByText('浅色'))
    expect(document.documentElement.classList.contains('light')).toBe(true)
    fireEvent.click(screen.getByText('深色'))
    expect(document.documentElement.classList.contains('light')).toBe(false)
  })

  it('健康区块:记体温 → 保存,最近体温与历史可见;新建疗程后可打卡', async () => {
    await seedProfile()
    render(<App />)
    await screen.findByText('小测')

    // 记体温(默认 36.8,直接保存)
    fireEvent.click(screen.getByText(/记体温/))
    await screen.findByText('体温记录')
    fireEvent.click(screen.getByText('保存'))
    await waitFor(() => expect(screen.queryByText('体温记录')).toBeNull())
    await screen.findByText(/最近体温 36\.8 °C/)

    // 新建疗程并打卡
    fireEvent.click(screen.getByText(/用药疗程/))
    await screen.findByText('用药疗程')
    fireEvent.change(screen.getByPlaceholderText('如:头孢克肟'), { target: { value: '阿莫西林' } })
    fireEvent.click(screen.getByText('保存'))
    await screen.findByText(/阿莫西林/)
    expect(screen.getByText(/今日 0\/3 次/)).toBeTruthy()
    fireEvent.click(screen.getByText('记一次'))
    await screen.findByText(/今日 1\/3 次/)

    // 记录页能看到体温与服药条目
    fireEvent.click(screen.getByText('记录'))
    await screen.findByText(/体温 36\.8 °C/)
    expect(screen.getByText(/服药 · 阿莫西林/)).toBeTruthy()
  })
})
