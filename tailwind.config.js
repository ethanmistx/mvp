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
          dim: '#a8a29e',
          text: '#e7e5e4',
        },
        warm: {
          DEFAULT: '#fbbf24',
          soft: '#fcd34d',
          deep: '#b45309',
        },
      },
    },
  },
  plugins: [],
}
