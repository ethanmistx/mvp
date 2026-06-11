// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { defaultLlmConfig, loadLlmConfig, loadProviderConfig, saveLlmConfig } from './settings'

describe('LLM 配置持久化(localStorage,按服务商分桶)', () => {
  beforeEach(() => localStorage.clear())

  it('默认配置为 DeepSeek 预设、空 Key', () => {
    const cfg = loadLlmConfig()
    expect(cfg).toEqual(defaultLlmConfig())
    expect(cfg.providerId).toBe('deepseek')
    expect(cfg.apiKey).toBe('')
  })

  it('保存后能完整读回,并成为当前生效配置', () => {
    saveLlmConfig({
      providerId: 'anyrouter',
      baseUrl: 'https://anyrouter.top',
      apiKey: 'sk-x',
      model: 'claude-sonnet-4-20250514',
      apiFormat: 'anthropic',
    })
    expect(loadLlmConfig()).toMatchObject({ providerId: 'anyrouter', apiFormat: 'anthropic', apiKey: 'sk-x' })
  })

  it('各服务商配置互不覆盖:自定义 anthropic 网关在切换后仍可读回', () => {
    saveLlmConfig({
      providerId: 'custom',
      baseUrl: 'https://my-gateway.example.com',
      apiKey: 'sk-custom',
      model: 'claude-opus-4-8',
      apiFormat: 'anthropic',
    })
    saveLlmConfig({
      providerId: 'deepseek',
      baseUrl: 'https://api.deepseek.com',
      apiKey: 'sk-ds',
      model: 'deepseek-chat',
      apiFormat: 'openai',
    })
    // 切回 custom:地址/模型/Key/格式全部保留
    expect(loadProviderConfig('custom')).toEqual({
      providerId: 'custom',
      baseUrl: 'https://my-gateway.example.com',
      apiKey: 'sk-custom',
      model: 'claude-opus-4-8',
      apiFormat: 'anthropic',
    })
    // 没存过的服务商给预设默认值
    expect(loadProviderConfig('kimi')).toMatchObject({
      baseUrl: 'https://api.moonshot.cn/v1',
      apiKey: '',
    })
  })

  it('v1 旧配置自动迁移到 v2', () => {
    localStorage.setItem(
      'llm-settings-v1',
      JSON.stringify({
        providerId: 'kimi',
        baseUrl: 'https://api.moonshot.cn/v1',
        apiKey: 'sk-old',
        model: 'moonshot-v1-8k',
        apiFormat: 'openai',
      }),
    )
    expect(loadLlmConfig()).toMatchObject({ providerId: 'kimi', apiKey: 'sk-old' })
  })

  it('损坏的存储回退到默认值', () => {
    localStorage.setItem('llm-settings-v2', '{not json')
    expect(loadLlmConfig()).toEqual(defaultLlmConfig())
  })
})
