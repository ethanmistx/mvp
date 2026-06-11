// 设置页的「AI 解读」区块:服务商配置 + 生成解读。
// 隐私原则:API Key 只存本机 localStorage(不进导出备份);
// 只有用户主动点击时,才把摘要发送给其选定的服务商,首次需确认。
import { useState } from 'react'
import { storage } from '../storage'
import { generateStructuredSummary } from '../lib/summary'
import { chatComplete, LlmError } from '../lib/llm/client'
import { buildInsightUserPrompt, INSIGHT_SYSTEM_PROMPT } from '../lib/llm/prompt'
import { getPreset, isConfigComplete, providerPresets, type ProviderId } from '../lib/llm/providers'
import {
  loadLastInsight,
  loadLlmConfig,
  loadProviderConfig,
  saveLastInsight,
  saveLlmConfig,
  type CachedInsight,
} from '../lib/llm/settings'
import { ConfirmDialog, Field, Segmented, inputCls } from './ui'

const CONSENT_KEY = 'llm-consent-v1'

export function AiInsightSection() {
  const [cfg, setCfg] = useState(loadLlmConfig)
  const [savedTip, setSavedTip] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [insight, setInsight] = useState<CachedInsight | null>(loadLastInsight)
  const [copied, setCopied] = useState(false)
  const [askConsent, setAskConsent] = useState(false)

  const preset = getPreset(cfg.providerId)

  const pickProvider = (id: ProviderId) => {
    // 先把当前编辑中的配置存到它自己的服务商名下,再载入目标服务商的配置,
    // 各家配置(地址/模型/Key/格式)互不覆盖
    saveLlmConfig(cfg)
    setCfg(loadProviderConfig(id))
  }

  const saveConfig = () => {
    saveLlmConfig(cfg)
    setSavedTip(true)
    setTimeout(() => setSavedTip(false), 1500)
  }

  const generate = async () => {
    saveLlmConfig(cfg) // 顺手保存,避免「忘了点保存」
    if (!localStorage.getItem(CONSENT_KEY)) {
      setAskConsent(true)
      return
    }
    await reallyGenerate()
  }

  const reallyGenerate = async () => {
    setBusy(true)
    setError(null)
    setCopied(false)
    try {
      const bundle = await storage.exportAll()
      if (!bundle.profile) return
      const summary = generateStructuredSummary({
        profile: bundle.profile,
        feeds: bundle.feeds,
        sleeps: bundle.sleeps,
        diapers: bundle.diapers,
        growths: bundle.growths,
        now: new Date(),
      })
      const text = await chatComplete(cfg, {
        system: INSIGHT_SYSTEM_PROMPT,
        user: buildInsightUserPrompt(summary),
      })
      const result: CachedInsight = {
        text,
        generatedAt: new Date().toISOString(),
        model: cfg.model,
      }
      setInsight(result)
      saveLastInsight(result)
    } catch (e) {
      setError(e instanceof LlmError ? e.message : '生成失败,请稍后重试。')
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => {
    if (!insight) return
    try {
      await navigator.clipboard.writeText(insight.text)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section className="card">
      <h2 className="font-semibold mb-1">🤖 AI 解读</h2>
      <p className="text-xs text-night-dim mb-3">
        用你自己的大模型 API Key 解读最近记录。Key 只保存在本机,不会进入导出备份;
        点「生成解读」时,只发送统计摘要(次数/时长/奶量/生长区间),不含备注原文。
      </p>

      <Field label="服务商">
        <Segmented
          options={providerPresets.map((p) => ({ value: p.id, label: p.label }))}
          value={cfg.providerId}
          onChange={pickProvider}
        />
      </Field>
      <Field label="接口地址">
        <input
          type="url"
          className={inputCls}
          value={cfg.baseUrl}
          placeholder="https://…"
          onChange={(e) => setCfg({ ...cfg, baseUrl: e.target.value })}
        />
      </Field>
      <Field label="模型">
        <input
          type="text"
          className={inputCls}
          value={cfg.model}
          onChange={(e) => setCfg({ ...cfg, model: e.target.value })}
        />
      </Field>
      {cfg.providerId === 'custom' && (
        <Field label="请求格式">
          <Segmented
            options={[
              { value: 'openai', label: 'OpenAI 兼容' },
              { value: 'anthropic', label: 'Anthropic 兼容' },
            ]}
            value={cfg.apiFormat}
            onChange={(v) => setCfg({ ...cfg, apiFormat: v })}
          />
        </Field>
      )}
      <Field label="API Key">
        <input
          type="password"
          className={inputCls}
          value={cfg.apiKey}
          placeholder={preset.keyUrl ? `在 ${preset.keyUrl} 申请` : 'sk-…'}
          onChange={(e) => setCfg({ ...cfg, apiKey: e.target.value })}
          autoComplete="off"
        />
      </Field>

      <div className="flex gap-2">
        <button className="btn-secondary flex-1 py-3" onClick={saveConfig}>
          {savedTip ? '已保存 ✓' : '保存配置'}
        </button>
        <button
          className="btn-primary flex-1 py-3"
          disabled={!isConfigComplete(cfg) || busy}
          onClick={() => void generate()}
        >
          {busy ? (
            <span className="inline-flex items-center gap-2">
              <span className="spinner" />
              生成中…
            </span>
          ) : (
            '生成解读'
          )}
        </button>
      </div>

      {error && <p className="text-xs text-red-300 mt-3">{error}</p>}

      {insight && (
        <div className="mt-3">
          <p className="text-xs text-night-dim mb-1">
            {new Date(insight.generatedAt).toLocaleString('zh-CN')} · {insight.model}
          </p>
          <div className="rounded-xl bg-night-bg border border-night-line p-3 text-sm leading-relaxed whitespace-pre-wrap">
            {insight.text}
          </div>
          <button className="btn-secondary w-full py-3 mt-2" onClick={() => void copy()}>
            {copied ? '已复制 ✓' : '复制解读'}
          </button>
          <p className="text-xs text-night-dim mt-2 text-center">
            AI 解读仅供日常参考,不构成医疗建议,临床判断以儿保医生为准
          </p>
        </div>
      )}

      <ConfirmDialog
        open={askConsent}
        title="发送数据给所选服务商?"
        message={`生成解读需要把最近 7 天的记录摘要发送给 ${preset.label === '自定义' ? '你配置的接口' : preset.label}。本应用自身不收集任何数据。此确认只出现一次。`}
        confirmLabel="同意并生成"
        tone="primary"
        onConfirm={() => {
          localStorage.setItem(CONSENT_KEY, '1')
          setAskConsent(false)
          void reallyGenerate()
        }}
        onCancel={() => setAskConsent(false)}
      />
    </section>
  )
}
