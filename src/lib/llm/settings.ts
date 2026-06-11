// LLM 配置的本地持久化。
// 刻意用 localStorage 而不进 StorageAdapter/ExportBundle:
// API Key 是设备级机密,绝不应跟着「导出 JSON」备份被分享出去。
//
// v2:每个服务商各存一份配置(baseUrl/model/key/format),切换服务商不会互相覆盖。

import { getPreset, type LlmConfig, type ProviderId } from './providers'

const SETTINGS_KEY = 'llm-settings-v2'
const LEGACY_SETTINGS_KEY = 'llm-settings-v1'
const INSIGHT_CACHE_KEY = 'llm-last-insight-v1'

interface StoredSettings {
  activeProvider: ProviderId
  byProvider: Partial<Record<ProviderId, LlmConfig>>
}

/** 通用的 localStorage JSON 读取:缺失/损坏一律返回 null */
function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function defaultConfigFor(id: ProviderId): LlmConfig {
  const p = getPreset(id)
  return { providerId: p.id, baseUrl: p.baseUrl, apiKey: '', model: p.defaultModel, apiFormat: p.apiFormat }
}

export function defaultLlmConfig(): LlmConfig {
  return defaultConfigFor('deepseek')
}

function sanitize(parsed: Partial<LlmConfig> | undefined, id: ProviderId): LlmConfig {
  const base = defaultConfigFor(id)
  if (!parsed) return base
  return {
    providerId: id,
    baseUrl: typeof parsed.baseUrl === 'string' ? parsed.baseUrl : base.baseUrl,
    apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : '',
    model: typeof parsed.model === 'string' ? parsed.model : base.model,
    apiFormat: parsed.apiFormat === 'anthropic' ? 'anthropic' : 'openai',
  }
}

function loadStored(): StoredSettings {
  const v2 = readJson<StoredSettings>(SETTINGS_KEY)
  if (v2 && typeof v2 === 'object' && v2.byProvider) return v2
  // v1 → v2 迁移:旧版只存单个配置
  const v1 = readJson<Partial<LlmConfig>>(LEGACY_SETTINGS_KEY)
  if (v1 && v1.providerId) {
    const id = v1.providerId
    return { activeProvider: id, byProvider: { [id]: sanitize(v1, id) } }
  }
  return { activeProvider: 'deepseek', byProvider: {} }
}

/** 当前生效的配置(上次保存/使用的服务商) */
export function loadLlmConfig(): LlmConfig {
  const stored = loadStored()
  return sanitize(stored.byProvider[stored.activeProvider], stored.activeProvider)
}

/** 某个服务商已保存的配置;没存过则给预设默认值 */
export function loadProviderConfig(id: ProviderId): LlmConfig {
  return sanitize(loadStored().byProvider[id], id)
}

/** 保存到该服务商名下,并把它设为当前生效 */
export function saveLlmConfig(cfg: LlmConfig): void {
  const stored = loadStored()
  stored.byProvider[cfg.providerId] = cfg
  stored.activeProvider = cfg.providerId
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(stored))
}

export interface CachedInsight {
  text: string
  generatedAt: string
  model: string
}

export function loadLastInsight(): CachedInsight | null {
  const parsed = readJson<CachedInsight>(INSIGHT_CACHE_KEY)
  return parsed && typeof parsed.text === 'string' && parsed.text !== '' ? parsed : null
}

export function saveLastInsight(insight: CachedInsight): void {
  localStorage.setItem(INSIGHT_CACHE_KEY, JSON.stringify(insight))
}
