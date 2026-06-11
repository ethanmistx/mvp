// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { defaultLlmConfig, loadLlmConfig, saveLlmConfig } from './settings'

describe('LLM 配置持久化(localStorage)', () => {
  beforeEach(() => localStorage.clear())

  it('默认配置为 DeepSeek 预设、空 Key', () => {
    const cfg = loadLlmConfig()
    expect(cfg).toEqual(defaultLlmConfig())
    expect(cfg.providerId).toBe('deepseek')
    expect(cfg.apiKey).toBe('')
  })

  it('保存后能完整读回', () => {
    saveLlmConfig({
      providerId: 'anyrouter',
      baseUrl: 'https://anyrouter.top',
      apiKey: 'sk-x',
      model: 'claude-sonnet-4-20250514',
      apiFormat: 'anthropic',
    })
    expect(loadLlmConfig()).toMatchObject({ providerId: 'anyrouter', apiFormat: 'anthropic', apiKey: 'sk-x' })
  })

  it('损坏的存储回退到默认值', () => {
    localStorage.setItem('llm-settings-v1', '{not json')
    expect(loadLlmConfig()).toEqual(defaultLlmConfig())
  })
})
