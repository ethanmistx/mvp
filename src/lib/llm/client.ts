// 极简 LLM 客户端:单轮 system+user → 文本回复。
// 不引入任何 SDK(红线:不加需要后端的依赖),直接 fetch 两种通用格式。

import type { LlmConfig } from './providers'

export interface ChatRequest {
  system: string
  user: string
  maxTokens?: number
  timeoutMs?: number
}

/** 调用失败时抛出,message 为可直接展示给用户的中文 */
export class LlmError extends Error {}

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, '')}${path}`
}

export async function chatComplete(cfg: LlmConfig, req: ChatRequest): Promise<string> {
  const { system, user, maxTokens = 1024, timeoutMs = 60_000 } = req
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  let url: string
  let headers: Record<string, string>
  let body: unknown
  if (cfg.apiFormat === 'anthropic') {
    url = joinUrl(cfg.baseUrl, '/v1/messages')
    headers = {
      'content-type': 'application/json',
      'x-api-key': cfg.apiKey,
      'anthropic-version': '2023-06-01',
      // 允许浏览器直连(Anthropic 兼容端点的 CORS 开关)
      'anthropic-dangerous-direct-browser-access': 'true',
    }
    body = {
      model: cfg.model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }
  } else {
    url = joinUrl(cfg.baseUrl, '/chat/completions')
    headers = {
      'content-type': 'application/json',
      authorization: `Bearer ${cfg.apiKey}`,
    }
    body = {
      model: cfg.model,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }
  }

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } catch (e) {
    clearTimeout(timer)
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new LlmError('请求超时,请稍后重试。')
    }
    // 浏览器 fetch 网络层失败:断网或服务商未开放浏览器跨域(CORS)
    throw new LlmError('网络请求失败:请检查网络;若网络正常,可能是该服务商不支持浏览器直连(CORS),可换用支持的网关(如 AnyRouter)。')
  }
  clearTimeout(timer)

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    if (res.status === 401 || res.status === 403) {
      throw new LlmError('API Key 无效或没有权限,请检查设置。')
    }
    if (res.status === 429) {
      throw new LlmError('请求太频繁或额度不足,请稍后再试。')
    }
    throw new LlmError(`服务商返回错误(${res.status}):${detail.slice(0, 200)}`)
  }

  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null
  const text = cfg.apiFormat === 'anthropic' ? parseAnthropic(json) : parseOpenai(json)
  if (!text) throw new LlmError('服务商返回了无法解析的内容,请检查模型名是否正确。')
  return text
}

function parseOpenai(json: Record<string, unknown> | null): string | null {
  const choices = json?.choices as Array<{ message?: { content?: string } }> | undefined
  const content = choices?.[0]?.message?.content
  return typeof content === 'string' && content.trim() !== '' ? content : null
}

function parseAnthropic(json: Record<string, unknown> | null): string | null {
  const content = json?.content as Array<{ type?: string; text?: string }> | undefined
  if (!Array.isArray(content)) return null
  const text = content
    .filter((b) => b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text)
    .join('')
  return text.trim() !== '' ? text : null
}
