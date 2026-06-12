/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // 语义色全部走 CSS 变量(src/index.css 定义深/浅两套),
        // html.light 时整体切换;`night.*` 命名保留为「表面层级」语义:
        // bg=页面底 / card=卡片 / line=分隔与次按钮 / dim=次要文字 / text=正文
        night: {
          bg: 'rgb(var(--c-bg) / <alpha-value>)',
          card: 'rgb(var(--c-card) / <alpha-value>)',
          line: 'rgb(var(--c-line) / <alpha-value>)',
          dim: 'rgb(var(--c-dim) / <alpha-value>)',
          text: 'rgb(var(--c-text) / <alpha-value>)',
        },
        warm: {
          DEFAULT: 'rgb(var(--c-warm) / <alpha-value>)',
          soft: 'rgb(var(--c-warm-soft) / <alpha-value>)',
          deep: 'rgb(var(--c-warm-deep) / <alpha-value>)',
        },
        // 睡眠进行中(冷色,与暖色操作区分)
        sleep: {
          bg: 'rgb(var(--c-sleep-bg) / <alpha-value>)',
          ring: 'rgb(var(--c-sleep-ring) / <alpha-value>)',
          text: 'rgb(var(--c-sleep-text) / <alpha-value>)',
          sub: 'rgb(var(--c-sleep-sub) / <alpha-value>)',
        },
        // 一键记录成功反馈
        success: {
          bg: 'rgb(var(--c-success-bg) / <alpha-value>)',
          text: 'rgb(var(--c-success-text) / <alpha-value>)',
        },
        // 错误文字与危险按钮
        danger: {
          DEFAULT: 'rgb(var(--c-danger) / <alpha-value>)',
          bg: 'rgb(var(--c-danger-bg) / <alpha-value>)',
          soft: 'rgb(var(--c-danger-soft) / <alpha-value>)',
        },
      },
    },
  },
  plugins: [],
}
