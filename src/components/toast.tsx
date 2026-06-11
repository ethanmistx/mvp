// 极简全局 Toast:保存类操作的统一轻反馈。
// 模块级单监听器 + App 挂一个 <Toaster/>,无 context、无队列(后到覆盖先到)。
import { useEffect, useRef, useState } from 'react'

type Listener = (text: string) => void
let listener: Listener | null = null

export function showToast(text: string): void {
  listener?.(text)
}

export function Toaster() {
  const [text, setText] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    listener = (t) => {
      setText(t)
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setText(null), 1600)
    }
    return () => {
      listener = null
      clearTimeout(timerRef.current)
    }
  }, [])

  if (!text) return null
  return (
    <div className="fixed inset-x-0 bottom-24 z-[70] flex justify-center pointer-events-none">
      <div className="animate-scale-in bg-night-line/95 text-night-text text-sm rounded-full px-4 py-2.5 shadow-lg">
        {text}
      </div>
    </div>
  )
}
