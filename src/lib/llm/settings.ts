// LLM 配置的本地持久化。
// 刻意用 localStorage 而不进 StorageAdapter/ExportBundle:
// API Key 是设备级机密,绝不应跟着「导出 JSON」备份被分享出去。

import { getPreset, type LlmConfig } from './providers'

const SETTINGS_KEY = 'llm-settings-v1'
const INSIGHT_CACHE_KEY = 'llm-last-insight-v1'

export function defaultLlmConfig(): LlmConfig {
  const p = getPreset('deepseek')
  return { providerId: p.id, baseUrl: p.baseUrl, apiKey: '', model: p.defaultModel, apiFormat: p.apiFormat }
}

export function loadLlmConfig(): LlmConfig {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return defaultLlmConfig()
    const parsed = JSON.parse(raw) as Partial<LlmConfig>
    const base = defaultLlmConfig()
    return {
      providerId: parsed.providerId ?? base.providerId,
      baseUrl: typeof parsed.baseUrl === 'string' ? parsed.baseUrl : base.baseUrl,
      apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : '',
      model: typeof parsed.model === 'string' ? parsed.model : base.model,
      apiFormat: parsed.apiFormat === 'anthropic' ? 'anthropic' : 'openai',
    }
  } catch {
    return defaultLlmConfig()
  }
}

export function saveLlmConfig(cfg: LlmConfig): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(cfg))
}

export interface CachedInsight {
  text: string
  generatedAt: string
  model: string
}

export function loadLastInsight(): CachedInsight | null {
  try {
    const raw = localStorage.getItem(INSIGHT_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachedInsight
    return typeof parsed.text === 'string' && parsed.text !== '' ? parsed : null
  } catch {
    return null
  }
}

export function saveLastInsight(insight: CachedInsight): void {
  localStorage.setItem(INSIGHT_CACHE_KEY, JSON.stringify(insight))
}
