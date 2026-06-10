// 设置页:宝宝档案编辑、数据导出/导入(数据主权)、生成 LLM/医生摘要。
import { useRef, useState } from 'react'
import type { BabyProfile, ExportBundle, Sex } from '../types'
import { storage } from '../storage'
import { notifyAll, useProfile } from '../hooks/useStore'
import { localDateStr } from '../lib/dates'
import { generateSummary } from '../lib/summary'
import { ConfirmDialog, Field, Segmented, inputCls } from '../components/ui'

export function SettingsPage({ profile }: { profile: BabyProfile }) {
  const { saveProfile } = useProfile()
  const [name, setName] = useState(profile.name)
  const [birthDate, setBirthDate] = useState(profile.birthDate)
  const [sex, setSex] = useState<Sex>(profile.sex)
  const [savedTip, setSavedTip] = useState(false)

  const [summary, setSummary] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [pendingImport, setPendingImport] = useState<ExportBundle | null>(null)
  const [importResult, setImportResult] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const profileChanged = name !== profile.name || birthDate !== profile.birthDate || sex !== profile.sex

  const saveBaby = () => {
    void saveProfile({ ...profile, name: name.trim(), birthDate, sex })
    setSavedTip(true)
    setTimeout(() => setSavedTip(false), 1500)
  }

  const doExport = async () => {
    const bundle = await storage.exportAll()
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `宝宝记录备份-${localDateStr(new Date())}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const onFilePicked = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as ExportBundle
      if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.feeds)) {
        setImportResult('文件格式不正确,请选择本应用导出的 JSON 备份。')
        return
      }
      setPendingImport(parsed) // 导入会覆盖现有数据,需二次确认
    } catch {
      setImportResult('无法解析该文件,请确认是本应用导出的 JSON 备份。')
    }
  }

  const doImport = async () => {
    if (!pendingImport) return
    await storage.importAll(pendingImport)
    notifyAll()
    setPendingImport(null)
    setImportResult(
      `导入完成:喂养 ${pendingImport.feeds.length} 条,睡眠 ${pendingImport.sleeps.length} 条,尿布 ${pendingImport.diapers.length} 条,生长 ${pendingImport.growths.length} 条。`,
    )
  }

  const makeSummary = async () => {
    const bundle = await storage.exportAll()
    if (!bundle.profile) return
    setSummary(
      generateSummary({
        profile: bundle.profile,
        feeds: bundle.feeds,
        sleeps: bundle.sleeps,
        diapers: bundle.diapers,
        growths: bundle.growths,
        now: new Date(),
      }),
    )
    setCopied(false)
  }

  const copySummary = async () => {
    if (!summary) return
    try {
      await navigator.clipboard.writeText(summary)
      setCopied(true)
    } catch {
      // 旧 WebView 无 clipboard API:选中文本让用户手动复制
      setCopied(false)
    }
  }

  return (
    <div className="p-4 pb-24 space-y-4">
      <h1 className="text-xl font-bold px-1 pt-2">设置</h1>

      <section className="card">
        <h2 className="font-semibold mb-3">宝宝档案</h2>
        <Field label="小名">
          <input type="text" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="出生日期">
          <input
            type="date"
            className={inputCls}
            value={birthDate}
            max={localDateStr(new Date())}
            onChange={(e) => setBirthDate(e.target.value)}
          />
        </Field>
        <Field label="性别(用于 WHO 生长参考标准)">
          <Segmented
            options={[
              { value: 'boy', label: '男宝' },
              { value: 'girl', label: '女宝' },
            ]}
            value={sex}
            onChange={setSex}
          />
        </Field>
        <button
          className="btn-big w-full py-3 bg-warm text-night-bg disabled:opacity-40"
          disabled={!profileChanged || name.trim() === ''}
          onClick={saveBaby}
        >
          {savedTip ? '已保存 ✓' : '保存档案'}
        </button>
      </section>

      <section className="card">
        <h2 className="font-semibold mb-1">数据摘要</h2>
        <p className="text-xs text-night-dim mb-3">
          生成最近 24 小时 / 7 天的结构化文字,可复制后发给医生,或粘贴给 AI 助手解读。
        </p>
        <button className="btn-big w-full py-3 bg-night-line" onClick={() => void makeSummary()}>
          生成摘要
        </button>
        {summary && (
          <div className="mt-3">
            <textarea
              readOnly
              className={`${inputCls} h-48 text-xs leading-relaxed`}
              value={summary}
              onFocus={(e) => e.target.select()}
            />
            <button className="btn-big w-full py-3 mt-2 bg-warm text-night-bg" onClick={() => void copySummary()}>
              {copied ? '已复制 ✓' : '一键复制'}
            </button>
          </div>
        )}
      </section>

      <section className="card">
        <h2 className="font-semibold mb-1">数据备份</h2>
        <p className="text-xs text-night-dim mb-3">
          所有数据只保存在本机浏览器里,不上传任何服务器。换设备或重装前请先导出。
        </p>
        <div className="flex gap-2">
          <button className="btn-big flex-1 py-3 bg-night-line" onClick={() => void doExport()}>
            导出 JSON
          </button>
          <button className="btn-big flex-1 py-3 bg-night-line" onClick={() => fileRef.current?.click()}>
            导入 JSON
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void onFilePicked(f)
            e.target.value = ''
          }}
        />
        {importResult && <p className="text-xs text-night-dim mt-3">{importResult}</p>}
      </section>

      <p className="text-xs text-night-dim text-center px-4">
        宝宝成长记录 Phase 0 · 本地离线应用
        <br />
        不做医疗判断;生长参考线为 WHO 标准,临床判断以儿保医生为准
      </p>

      <ConfirmDialog
        open={pendingImport !== null}
        title="导入并覆盖现有数据?"
        message="导入会清空当前所有记录,替换为备份文件中的数据。"
        confirmLabel="导入"
        onConfirm={() => void doImport()}
        onCancel={() => setPendingImport(null)}
      />
    </div>
  )
}
