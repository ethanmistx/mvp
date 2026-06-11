/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // 深色暖夜配色:stone 底 + amber 强调,深夜单手使用不刺眼
        night: {
          bg: '#1c1917',
          card: '#292524',
          line: '#44403c',
          dim: '#b0a9a3',
          text: '#e7e5e4',
        },
        warm: {
          // amber-500:比 amber-400 暗一档,降低深夜大面积主按钮的眩光
          DEFAULT: '#f59e0b',
          soft: '#fcd34d',
          deep: '#b45309',
        },
      },
    },
  },
  plugins: [],
}
