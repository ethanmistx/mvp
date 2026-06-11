import { afterEach, describe, expect, it, vi } from 'vitest'
import { chatComplete, LlmError } from './client'
import type { LlmConfig } from './providers'

const openaiCfg: LlmConfig = {
  providerId: 'deepseek',
  baseUrl: 'https://api.deepseek.com',
  apiKey: 'sk-test',
  model: 'deepseek-chat',
  apiFormat: 'openai',
}

const anthropicCfg: LlmConfig = {
  providerId: 'anyrouter',
  baseUrl: 'https://anyrouter.top/',
  apiKey: 'sk-ant-test',
  model: 'claude-sonnet-4-20250514',
  apiFormat: 'anthropic',
}

function mockFetchOnce(status: number, body: unknown) {
  const fn = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }),
  )
  vi.stubGlobal('fetch', fn)
  return fn
}

afterEach(() => vi.unstubAllGlobals())

describe('chatComplete · openai 格式(DeepSeek/Kimi)', () => {
  it('请求 /chat/completions,带 Bearer 头与 system/user 消息', async () => {
    const fn = mockFetchOnce(200, { choices: [{ message: { content: '你好' } }] })
    const text = await chatComplete(openaiCfg, { system: 'S', user: 'U' })
    expect(text).toBe('你好')
    const [url, init] = fn.mock.calls[0]
    expect(url).toBe('https://api.deepseek.com/chat/completions')
    expect(init.headers.authorization).toBe('Bearer sk-test')
    const body = JSON.parse(init.body)
    expect(body.model).toBe('deepseek-chat')
    expect(body.messages).toEqual([
      { role: 'system', content: 'S' },
      { role: 'user', content: 'U' },
    ])
  })

  it('baseUrl 带 /v1 时正确拼接(Kimi)', async () => {
    const fn = mockFetchOnce(200, { choices: [{ message: { content: 'ok' } }] })
    await chatComplete(
      { ...openaiCfg, baseUrl: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
      { system: 'S', user: 'U' },
    )
    expect(fn.mock.calls[0][0]).toBe('https://api.moonshot.cn/v1/chat/completions')
  })
})

describe('chatComplete · anthropic 格式(AnyRouter)', () => {
  it('请求 /v1/messages,带 x-api-key 与 system 字段,解析 content 块', async () => {
    const fn = mockFetchOnce(200, { content: [{ type: 'text', text: '解读结果' }] })
    const text = await chatComplete(anthropicCfg, { system: 'S', user: 'U' })
    expect(text).toBe('解读结果')
    const [url, init] = fn.mock.calls[0]
    expect(url).toBe('https://anyrouter.top/v1/messages') // 末尾斜杠被规整
    expect(init.headers['x-api-key']).toBe('sk-ant-test')
    expect(init.headers['anthropic-version']).toBe('2023-06-01')
    const body = JSON.parse(init.body)
    expect(body.system).toBe('S')
    expect(body.messages).toEqual([{ role: 'user', content: 'U' }])
    expect(body.max_tokens).toBeGreaterThan(0)
  })
})

describe('chatComplete · 错误处理', () => {
  it('401 → 提示检查 Key', async () => {
    mockFetchOnce(401, { error: 'unauthorized' })
    await expect(chatComplete(openaiCfg, { system: 'S', user: 'U' })).rejects.toThrowError(
      /API Key 无效/,
    )
  })
  it('429 → 提示额度/频率', async () => {
    mockFetchOnce(429, {})
    await expect(chatComplete(openaiCfg, { system: 'S', user: 'U' })).rejects.toThrowError(
      /额度不足|太频繁/,
    )
  })
  it('网络层失败 → 提示网络或 CORS', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(chatComplete(openaiCfg, { system: 'S', user: 'U' })).rejects.toThrowError(/CORS/)
  })
  it('响应缺少内容 → 友好报错', async () => {
    mockFetchOnce(200, { choices: [] })
    await expect(chatComplete(openaiCfg, { system: 'S', user: 'U' })).rejects.toThrow(LlmError)
  })
})
