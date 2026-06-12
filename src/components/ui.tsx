import type { ReactNode } from 'react'

/** 底部弹层:深夜单手场景下所有表单都从底部弹出,拇指可达 */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 animate-fade-in" onClick={onClose} />
      <div className="sheet-panel relative w-full max-w-md glass-strong rounded-t-3xl px-5 pb-8 overflow-y-auto animate-sheet-in">
        {/* 拖拽把手视觉示意;吸顶头部同为毛玻璃,内容滚过时透出模糊 */}
        <div className="sticky top-0 glass rounded-none pt-2.5 pb-1 -mx-5 px-5">
          <div className="mx-auto w-9 h-1 rounded-full bg-night-line" />
          <div className="flex items-center justify-between mt-2">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button
              className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center rounded-2xl text-night-dim active:scale-95 transition-transform"
              onClick={onClose}
              aria-label="关闭"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="pt-2">{children}</div>
      </div>
    </div>
  )
}

/** 删除等危险操作的二次确认;tone=primary 用于非危险的确认(如发送数据) */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = '删除',
  tone = 'danger',
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  message?: string
  confirmLabel?: string
  tone?: 'danger' | 'primary'
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/70 animate-fade-in" onClick={onCancel} />
      <div className="relative w-full max-w-xs glass-strong rounded-2xl p-5 animate-scale-in">
        <p className="font-semibold mb-1">{title}</p>
        {message && <p className="text-sm text-night-dim mb-4">{message}</p>}
        <div className="flex gap-3 mt-3">
          <button className="btn-secondary flex-1 py-3" onClick={onCancel}>
            取消
          </button>
          <button
            className={`btn-big flex-1 py-3 ${
              tone === 'danger' ? 'bg-danger-bg/90 text-danger-soft' : 'bg-warm text-night-bg'
            }`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

/** 数字步进器:大按钮 ±step,带常用预设 */
export function Stepper({
  value,
  onChange,
  step = 10,
  min = 0,
  unit,
  presets = [],
}: {
  value: number
  onChange: (v: number) => void
  step?: number
  min?: number
  unit: string
  presets?: number[]
}) {
  return (
    <div>
      <div className="flex items-center justify-center gap-4">
        <button
          className="btn-secondary w-14 h-14 text-2xl"
          onClick={() => onChange(Math.max(min, value - step))}
          aria-label={`减 ${step}`}
        >
          −
        </button>
        <div className="min-w-[7rem] text-center">
          <span className="text-4xl font-bold tabular-nums">{value}</span>
          <span className="text-night-dim ml-1">{unit}</span>
        </div>
        <button
          className="btn-secondary w-14 h-14 text-2xl"
          onClick={() => onChange(value + step)}
          aria-label={`加 ${step}`}
        >
          +
        </button>
      </div>
      {presets.length > 0 && (
        <div className="flex gap-2 mt-3 justify-center">
          {presets.map((p) => (
            <button
              key={p}
              className={`btn-big min-h-[44px] px-4 text-sm transition-colors ${
                value === p ? 'bg-warm text-night-bg' : 'bg-night-line'
              }`}
              onClick={() => onChange(p)}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** 分段选择(类型切换) */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string }>
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          className={`btn-big flex-1 py-3 text-sm transition-colors ${
            value === o.value ? 'bg-warm text-night-bg font-semibold' : 'bg-night-line'
          }`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block mb-4">
      <span className="block text-sm text-night-dim mb-1.5">{label}</span>
      {children}
    </label>
  )
}

/** 卡片化的空状态提示 */
export function EmptyState({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <div className="card text-center py-10">
      <p className="text-3xl mb-2">{icon}</p>
      <p className="text-sm text-night-dim leading-relaxed">{children}</p>
    </div>
  )
}

export const inputCls =
  'w-full min-h-[44px] rounded-xl bg-night-bg border border-night-line px-3 py-2 text-night-text'
