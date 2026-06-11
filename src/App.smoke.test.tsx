// @vitest-environment jsdom
// 端到端冒烟:引导建档 → 一键记录尿布 → 开始/结束睡眠 → 统计正确。
// 本环境无法下载真实浏览器(网络策略),用 jsdom + fake-indexeddb 替代。
import 'fake-indexeddb/auto'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'

afterEach(cleanup)

describe('App 冒烟', () => {
  it('完成引导后可一键记录尿布与睡眠,统计实时更新', async () => {
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
    render(<App />)
    await screen.findByText('小测') // 档案已存在,直接进首页
    fireEvent.click(screen.getByText('配方奶'))
    await screen.findByText('喂养记录')
    fireEvent.click(screen.getByText('保存'))
    await waitFor(() => expect(screen.queryByText('喂养记录')).toBeNull())
    await screen.findByText(/今日 1 次 · 120 ml/)
    expect(screen.getByText(/上次喂养:刚刚/)).toBeTruthy()
  })

  it('设置页:AI 解读配置区可用,服务商切换带入预设', async () => {
    render(<App />)
    await screen.findByText('小测')
    fireEvent.click(screen.getByText('设置'))
    await screen.findByText('AI 解读')

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
  })
})
