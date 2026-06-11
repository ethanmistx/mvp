// LLM 服务商预设。统一抽象为「baseUrl + apiKey + model + 请求格式」,
// openai 格式 = /chat/completions(DeepSeek、Kimi 及绝大多数聚合网关),
// anthropic 格式 = /v1/messages(AnyRouter 等 Claude 兼容网关)。
// 模型名只是默认值,均可在设置中修改。

export type ApiFormat = 'openai' | 'anthropic'

export type ProviderId = 'deepseek' | 'kimi' | 'anyrouter' | 'custom'

export interface ProviderPreset {
  id: ProviderId
  label: string
  baseUrl: string
  defaultModel: string
  apiFormat: ApiFormat
  /** 申请 API Key 的入口,显示在设置页帮助文案里 */
  keyUrl: string
}

export const providerPresets: ProviderPreset[] = [
  {
    id: 'deepseek',
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    defaultModel: 'deepseek-chat',
    apiFormat: 'openai',
    keyUrl: 'https://platform.deepseek.com',
  },
  {
    id: 'kimi',
    label: 'Kimi',
    baseUrl: 'https://api.moonshot.cn/v1',
    defaultModel: 'moonshot-v1-8k',
    apiFormat: 'openai',
    keyUrl: 'https://platform.moonshot.cn',
  },
  {
    id: 'anyrouter',
    label: 'AnyRouter',
    baseUrl: 'https://anyrouter.top',
    defaultModel: 'claude-sonnet-4-20250514',
    apiFormat: 'anthropic',
    keyUrl: 'https://anyrouter.top',
  },
  {
    id: 'custom',
    label: '自定义',
    baseUrl: '',
    defaultModel: '',
    apiFormat: 'openai',
    keyUrl: '',
  },
]

export function getPreset(id: ProviderId): ProviderPreset {
  return providerPresets.find((p) => p.id === id) ?? providerPresets[3]
}

export interface LlmConfig {
  providerId: ProviderId
  baseUrl: string
  apiKey: string
  model: string
  apiFormat: ApiFormat
}

export function isConfigComplete(cfg: LlmConfig): boolean {
  return cfg.baseUrl.trim() !== '' && cfg.apiKey.trim() !== '' && cfg.model.trim() !== ''
}
