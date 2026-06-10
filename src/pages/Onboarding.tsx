// 首次启动引导:填宝宝姓名、出生日期、性别(后续可在设置页修改)
import { useState } from 'react'
import type { BabyProfile, Sex } from '../types'
import { localDateStr } from '../lib/dates'
import { newId } from '../lib/id'
import { Field, Segmented, inputCls } from '../components/ui'

export function Onboarding({ onSave }: { onSave: (p: BabyProfile) => void }) {
  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState(localDateStr(new Date()))
  const [sex, setSex] = useState<Sex>('boy')

  const valid = name.trim().length > 0 && birthDate !== ''

  return (
    <div className="min-h-screen flex flex-col justify-center p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-1">👋 欢迎</h1>
      <p className="text-night-dim text-sm mb-8">
        填一下宝宝的基本信息就能开始记录。所有数据只保存在这台设备上,不会上传。
      </p>
      <Field label="宝宝小名">
        <input
          type="text"
          className={inputCls}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="如:糖糖"
        />
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
      <Field label="性别(用于选择 WHO 生长参考标准)">
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
        className="btn-big w-full py-4 mt-4 bg-warm text-night-bg text-lg disabled:opacity-40"
        disabled={!valid}
        onClick={() => onSave({ id: newId(), name: name.trim(), birthDate, sex })}
      >
        开始记录
      </button>
    </div>
  )
}
