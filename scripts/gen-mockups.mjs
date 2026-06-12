// 原型效果图生成器:按应用真实设计 token 手绘 SVG → resvg 渲染 PNG(2x)。
// 注:渲染环境无彩色 emoji 字体,界面中的 emoji 以等义矢量小图标呈现。
//
// 运行(渲染器不作为项目依赖,临时安装即可):
//   npm i --no-save @resvg/resvg-js && node scripts/gen-mockups.mjs
// 需要系统中文字体(如 WenQuanYi Zen Hei)。
import { Resvg } from '@resvg/resvg-js'
import { mkdirSync, writeFileSync } from 'node:fs'

const OUT = new URL('../docs/mockups', import.meta.url).pathname
mkdirSync(OUT, { recursive: true })

// 设计 token(与 tailwind.config.js 一致)
const C = {
  bg: '#1c1917',
  card: '#292524',
  line: '#44403c',
  dim: '#b0a9a3',
  text: '#e7e5e4',
  warm: '#f59e0b',
  warmSoft: '#fcd34d',
  gold: '#fbbf24',
  ink: '#1c1917',
  indigoBg: '#1e1b4b',
  indigoRing: '#818cf8',
  indigoText: '#c7d2fe',
  indigoDim: '#a5b4fc',
  red: '#fca5a5',
  stone500: '#78716c',
}
const FONT = 'WenQuanYi Zen Hei'
const W = 390
const M = 16 // 页面左右边距

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

function t(x, y, str, { size = 14, fill = C.text, bold = false, anchor = 'start', spacing } = {}) {
  const b = bold ? ` stroke="${fill}" stroke-width="0.55"` : ''
  const ls = spacing ? ` letter-spacing="${spacing}"` : ''
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" fill="${fill}"${b}${ls} text-anchor="${anchor}">${esc(str)}</text>`
}

function rr(x, y, w, h, rx, fill, stroke, sw = 1, opacity) {
  const s = stroke ? ` stroke="${stroke}" stroke-width="${sw}"` : ''
  const o = opacity != null ? ` fill-opacity="${opacity}"` : ''
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"${s}${o}/>`
}

// ---------- 矢量小图标(line 风格,渲染环境无 emoji 字体) ----------
const stroke = (color, w = 1.8) =>
  `fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`

const icons = {
  house: (x, y, c, s = 1) =>
    `<g transform="translate(${x},${y}) scale(${s})"><path d="M3 11 L11 4 L19 11" ${stroke(c)}/><path d="M5.5 10.5 V18 H16.5 V10.5" ${stroke(c)}/></g>`,
  list: (x, y, c, s = 1) =>
    `<g transform="translate(${x},${y}) scale(${s})"><circle cx="4" cy="6" r="1.2" fill="${c}"/><line x1="8" y1="6" x2="18" y2="6" ${stroke(c)}/><circle cx="4" cy="11" r="1.2" fill="${c}"/><line x1="8" y1="11" x2="18" y2="11" ${stroke(c)}/><circle cx="4" cy="16" r="1.2" fill="${c}"/><line x1="8" y1="16" x2="18" y2="16" ${stroke(c)}/></g>`,
  trend: (x, y, c, s = 1) =>
    `<g transform="translate(${x},${y}) scale(${s})"><path d="M3 17 L9 11 L12 14 L19 6" ${stroke(c)}/><path d="M14.5 6 H19 V10.5" ${stroke(c)}/></g>`,
  gear: (x, y, c, s = 1) =>
    `<g transform="translate(${x},${y}) scale(${s})"><circle cx="11" cy="11" r="3.2" ${stroke(c)}/><g ${stroke(c)}>` +
    [0, 60, 120, 180, 240, 300]
      .map((a) => `<line x1="11" y1="3.2" x2="11" y2="5.6" transform="rotate(${a} 11 11)"/>`)
      .join('') +
    `</g><circle cx="11" cy="11" r="7" ${stroke(c)}/></g>`,
  bottle: (x, y, c, s = 1) =>
    `<g transform="translate(${x},${y}) scale(${s})"><path d="M9 3.5 H13" ${stroke(c)}/><path d="M9.6 3.5 C9.6 5 8.6 5.6 8.6 7" ${stroke(c)}/><path d="M12.4 3.5 C12.4 5 13.4 5.6 13.4 7" ${stroke(c)}/><rect x="7.4" y="7" width="7.2" height="11.5" rx="2.4" ${stroke(c)}/><line x1="7.4" y1="11" x2="14.6" y2="11" ${stroke(c, 1.2)}/><line x1="7.4" y1="14" x2="14.6" y2="14" ${stroke(c, 1.2)}/></g>`,
  heart: (x, y, c, s = 1) =>
    `<g transform="translate(${x},${y}) scale(${s})"><path d="M11 18 C5 13.5 3.4 10.4 4.8 7.8 C6 5.6 9.2 5.4 11 8 C12.8 5.4 16 5.6 17.2 7.8 C18.6 10.4 17 13.5 11 18 Z" ${stroke(c)}/></g>`,
  glass: (x, y, c, s = 1) =>
    `<g transform="translate(${x},${y}) scale(${s})"><path d="M6.5 4 L7.5 18.5 H14.5 L15.5 4 Z" ${stroke(c)}/><path d="M7 9 C9 10.4 13 10.4 15 9" ${stroke(c, 1.4)}/></g>`,
  bowl: (x, y, c, s = 1) =>
    `<g transform="translate(${x},${y}) scale(${s})"><path d="M4 10 H18 C18 14.5 15 17 11 17 C7 17 4 14.5 4 10 Z" ${stroke(c)}/><line x1="13" y1="4" x2="16.5" y2="8.5" ${stroke(c)}/></g>`,
  moon: (x, y, c, s = 1) =>
    `<g transform="translate(${x},${y}) scale(${s})"><path d="M14.5 4.5 A8 8 0 1 0 19.5 13.5 A6.4 6.4 0 0 1 14.5 4.5 Z" ${stroke(c)}/></g>`,
  zzz: (x, y, c, s = 1) =>
    `<g transform="translate(${x},${y}) scale(${s})"><path d="M4 8 H9 L4 14 H9" ${stroke(c)}/><path d="M12 5 H16 L12 10 H16" ${stroke(c, 1.5)}/></g>`,
  drop: (x, y, c, s = 1) =>
    `<g transform="translate(${x},${y}) scale(${s})"><path d="M11 3.5 C14 7.5 16.5 10.5 16.5 13.2 A5.5 5.5 0 0 1 5.5 13.2 C5.5 10.5 8 7.5 11 3.5 Z" ${stroke(c)}/></g>`,
  poop: (x, y, c, s = 1) =>
    `<g transform="translate(${x},${y}) scale(${s})"><path d="M10 3.6 C12.4 4.4 12.2 6.2 11.6 7.2 C13.8 7.2 14.8 8.8 14.3 10.3 C16.4 10.7 17.2 12.6 16.4 14.2 C15.8 15.6 14.4 16.4 12.8 16.4 H9.2 C7.6 16.4 6.2 15.6 5.6 14.2 C4.8 12.6 5.6 10.7 7.7 10.3 C7.2 8.8 8.2 7.2 10.4 7.2 C9.6 6 9.4 4.6 10 3.6 Z" ${stroke(c)}/></g>`,
  ruler: (x, y, c, s = 1) =>
    `<g transform="translate(${x},${y}) scale(${s})"><rect x="3" y="8" width="16" height="6.5" rx="1.6" ${stroke(c)}/><line x1="7" y1="8" x2="7" y2="11" ${stroke(c, 1.3)}/><line x1="11" y1="8" x2="11" y2="11" ${stroke(c, 1.3)}/><line x1="15" y1="8" x2="15" y2="11" ${stroke(c, 1.3)}/></g>`,
  trash: (x, y, c, s = 1) =>
    `<g transform="translate(${x},${y}) scale(${s})"><path d="M5 6.5 H17" ${stroke(c, 1.5)}/><path d="M9 6.5 V5 H13 V6.5" ${stroke(c, 1.5)}/><path d="M6.5 6.5 L7.3 17 H14.7 L15.5 6.5" ${stroke(c, 1.5)}/></g>`,
  dropPoop: (x, y, c, s = 1) =>
    `<g transform="translate(${x},${y}) scale(${s})"><path d="M7 4.5 C8.8 7 10.2 8.8 10.2 10.5 A3.3 3.3 0 0 1 3.7 10.5 C3.7 8.8 5.2 7 7 4.5 Z" ${stroke(c, 1.5)}/><path d="M15.2 9.6 C16.6 10.1 16.5 11.2 16.1 11.8 C17.4 11.8 18 12.8 17.7 13.7 C18.9 14 19.4 15.1 18.9 16 C18.5 16.9 17.7 17.4 16.7 17.4 H13.7 C12.7 17.4 11.9 16.9 11.5 16 C11 15.1 11.5 14 12.7 13.7 C12.4 12.8 13 11.8 14.3 11.8 C13.8 11 13.8 10.2 15.2 9.6 Z" ${stroke(c, 1.5)}/></g>`,
  flame: (x, y, c, s = 1) =>
    `<g transform="translate(${x},${y}) scale(${s})"><path d="M11 3.5 C12.5 6.5 15.5 8.5 15.5 12 A4.5 4.5 0 0 1 6.5 12 C6.5 10 7.5 8.6 8.6 7.4 C8.8 8.6 9.4 9.4 10.4 9.8 C9.8 7.6 10.2 5.4 11 3.5 Z" ${stroke(c)}/></g>`,
  baby: (x, y, c, s = 1) =>
    `<g transform="translate(${x},${y}) scale(${s})"><circle cx="11" cy="8" r="4.2" ${stroke(c)}/><path d="M5.5 18 C6 14.6 8.2 13.2 11 13.2 C13.8 13.2 16 14.6 16.5 18" ${stroke(c)}/></g>`,
  doc: (x, y, c, s = 1) =>
    `<g transform="translate(${x},${y}) scale(${s})"><rect x="5.5" y="3.5" width="11" height="15" rx="2" ${stroke(c)}/><line x1="8" y1="8" x2="14" y2="8" ${stroke(c, 1.3)}/><line x1="8" y1="11" x2="14" y2="11" ${stroke(c, 1.3)}/><line x1="8" y1="14" x2="12" y2="14" ${stroke(c, 1.3)}/></g>`,
  bot: (x, y, c, s = 1) =>
    `<g transform="translate(${x},${y}) scale(${s})"><rect x="4.5" y="7" width="13" height="9.5" rx="3" ${stroke(c)}/><line x1="11" y1="4" x2="11" y2="7" ${stroke(c, 1.5)}/><circle cx="11" cy="3.6" r="1" fill="${c}"/><circle cx="8.4" cy="11.5" r="1.2" fill="${c}"/><circle cx="13.6" cy="11.5" r="1.2" fill="${c}"/></g>`,
  save: (x, y, c, s = 1) =>
    `<g transform="translate(${x},${y}) scale(${s})"><path d="M4.5 6.5 A2 2 0 0 1 6.5 4.5 H14 L17.5 8 V15.5 A2 2 0 0 1 15.5 17.5 H6.5 A2 2 0 0 1 4.5 15.5 Z" ${stroke(c)}/><rect x="8" y="11.5" width="6" height="6" ${stroke(c, 1.4)}/><rect x="8.5" y="4.5" width="5" height="3.5" ${stroke(c, 1.4)}/></g>`,
}

// ---------- 公共框架 ----------
function statusBar() {
  return [
    t(M + 8, 30, '02:34', { size: 13, fill: C.dim, bold: true }),
    `<g ${stroke(C.dim, 1.3)}><rect x="${W - 44}" y="20" width="20" height="11" rx="3"/><line x1="${W - 21.5}" y1="24" x2="${W - 21.5}" y2="27"/></g>`,
    `<rect x="${W - 42}" y="22" width="11" height="7" rx="1.5" fill="${C.dim}"/>`,
  ].join('')
}

const TABS = [
  { id: 'today', label: '今日', icon: icons.house },
  { id: 'history', label: '记录', icon: icons.list },
  { id: 'growth', label: '生长', icon: icons.trend },
  { id: 'settings', label: '设置', icon: icons.gear },
]

function tabBar(active, H) {
  const top = H - 84
  const parts = [
    `<rect x="0" y="${top}" width="${W}" height="84" fill="${C.card}"/>`,
    `<line x1="0" y1="${top}" x2="${W}" y2="${top}" stroke="${C.line}"/>`,
  ]
  const iw = W / 4
  TABS.forEach((tab, i) => {
    const cx = iw * i + iw / 2
    const color = tab.id === active ? C.warm : C.dim
    if (tab.id === active) parts.push(rr(cx - 16, top + 1.5, 32, 2.5, 1.2, C.warm))
    parts.push(tab.icon(cx - 11, top + 9, color))
    parts.push(t(cx, top + 48, tab.label, { size: 11, fill: color, anchor: 'middle' }))
  })
  return parts.join('')
}

function frame(H, active, content, overlay = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
<rect width="${W}" height="${H}" fill="${C.bg}"/>
${statusBar()}
${content}
${tabBar(active, H)}
${overlay}
</svg>`
}

// 区块标题 + 右侧统计
function cardHead(x, y, w, title, stats) {
  return [
    t(x + 16, y + 27, title, { size: 15, bold: true }),
    stats ? t(x + w - 16, y + 26, stats, { size: 11, fill: C.dim, anchor: 'end' }) : '',
  ].join('')
}

function secondaryBtn(x, y, w, h, label, { size = 14, fill = C.line, color = C.text } = {}) {
  return rr(x, y, w, h, 14, fill) + t(x + w / 2, y + h / 2 + size * 0.36, label, { size, fill: color, anchor: 'middle' })
}

function primaryBtn(x, y, w, h, label, size = 16) {
  return rr(x, y, w, h, 16, C.warm) + t(x + w / 2, y + h / 2 + size * 0.36, label, { size, fill: C.ink, anchor: 'middle', bold: true })
}

function iconBtn(x, y, w, h, icon, label, { active = false } = {}) {
  const bg = active ? '#064e3b' : C.line
  const fg = active ? '#a7f3d0' : C.text
  return [
    rr(x, y, w, h, 14, bg),
    icon(x + w / 2 - 11, y + 10, fg),
    t(x + w / 2, y + h - 12, label, { size: 11, fill: fg, anchor: 'middle' }),
  ].join('')
}

function input(x, y, w, h, value, { placeholder = false, label } = {}) {
  const parts = []
  let yy = y
  if (label) {
    parts.push(t(x, yy + 10, label, { size: 12, fill: C.dim }))
    yy += 20
  }
  parts.push(rr(x, yy, w, h, 12, C.bg, C.line))
  parts.push(t(x + 12, yy + h / 2 + 5, value, { size: 14, fill: placeholder ? C.stone500 : C.text }))
  return { svg: parts.join(''), bottom: yy + h }
}

// ---------- 今日页 ----------
function feedCard(y, sleeping = false) {
  const x = M, w = W - 2 * M
  const parts = [rr(x, y, w, h_feed, 16, C.card), cardHead(x, y, w, '喂养', '今日 5 次 · 480 ml · 亲喂 25 分')]
  const bw = (w - 32 - 24) / 4
  const labels = [
    ['亲喂', icons.heart],
    ['瓶喂母乳', icons.bottle],
    ['配方奶', icons.glass],
    ['辅食', icons.bowl],
  ]
  labels.forEach(([label, ic], i) => {
    parts.push(iconBtn(x + 16 + i * (bw + 8), y + 44, bw, 64, ic, label))
  })
  parts.push(t(x + 16, y + 132, sleeping ? '上次喂养:25 分钟前' : '上次喂养:1 小时 20 分前', { size: 13, fill: C.dim }))
  return parts.join('')
}
const h_feed = 148

function sleepCard(y, ongoing) {
  const x = M, w = W - 2 * M, h = 178
  const parts = [rr(x, y, w, h, 16, C.card), cardHead(x, y, w, '睡眠', ongoing ? '今日 3 小时 12 分 · 2 段' : '今日 4 小时 35 分 · 3 段 · 最长 2 小时')]
  if (ongoing) {
    parts.push(rr(x + 16, y + 42, w - 32, 76, 16, C.indigoBg, C.indigoRing, 1.2))
    parts.push(icons.zzz(x + w / 2 - 78, y + 60, C.indigoText))
    parts.push(t(x + w / 2 - 50, y + 76, '睡眠中', { size: 17, fill: C.indigoText, bold: true }))
    parts.push(t(x + w / 2 + 14, y + 76, '1:23:45', { size: 17, fill: '#e0e7ff', bold: true, spacing: 0.5 }))
    parts.push(t(x + w / 2, y + 100, '01:10 入睡 · 点按结束', { size: 12, fill: C.indigoDim, anchor: 'middle' }))
  } else {
    parts.push(rr(x + 16, y + 42, w - 32, 76, 16, C.line))
    parts.push(icons.moon(x + w / 2 - 56, y + 68, C.warmSoft))
    parts.push(t(x + w / 2 + 14, y + 85, '开始睡眠', { size: 17, anchor: 'middle', bold: true }))
  }
  parts.push(rr(x + 16, y + 126, w - 32, 38, 14, 'none', C.line))
  parts.push(t(x + w / 2, y + 150, '手动补记一段', { size: 12, fill: C.dim, anchor: 'middle' }))
  return parts.join('')
}

function diaperCard(y, saved = -1) {
  const x = M, w = W - 2 * M, h = 142
  const parts = [rr(x, y, w, h, 16, C.card), cardHead(x, y, w, '换尿布', '今日 6 次(湿 4 · 便 1 · 混 1)')]
  const bw = (w - 32 - 16) / 3
  const items = [
    ['尿湿', icons.drop],
    ['便便', icons.poop],
    ['混合', icons.dropPoop],
  ]
  items.forEach(([label, ic], i) => {
    parts.push(iconBtn(x + 16 + i * (bw + 8), y + 44, bw, 68, ic, saved === i ? '已记录 ✓' : label, { active: saved === i }))
  })
  return parts.join('')
}

function todayContent(sleeping) {
  const parts = []
  parts.push(t(M + 8, 84, '糖糖', { size: 21, bold: true }))
  parts.push(t(M + 8, 108, '出生第 182 天 · 6 个月 0 天', { size: 13, fill: C.dim }))
  parts.push(rr(M + 8, 120, 132, 26, 13, C.warm, null, 0, 0.12))
  parts.push(icons.flame(M + 14, 124, C.warm, 0.82))
  parts.push(t(M + 34, 137, '已连续记录 23 天', { size: 11.5, fill: C.warm }))
  parts.push(feedCard(162, sleeping))
  parts.push(sleepCard(162 + h_feed + 12, sleeping))
  parts.push(diaperCard(162 + h_feed + 12 + 178 + 12, sleeping ? 0 : -1))
  return parts.join('')
}

// ---------- 喂养弹层 ----------
function feedSheet() {
  const top = 236, x = 0, w = W
  const parts = []
  parts.push(`<rect width="${W}" height="844" fill="#000" fill-opacity="0.6"/>`)
  parts.push(`<path d="M${x} ${top + 24} A24 24 0 0 1 ${x + 24} ${top} H${w - 24} A24 24 0 0 1 ${w} ${top + 24} V844 H0 Z" fill="${C.card}"/>`)
  parts.push(rr(W / 2 - 18, top + 10, 36, 4, 2, C.line))
  parts.push(t(20, top + 44, '喂养记录', { size: 18, bold: true }))
  parts.push(t(W - 28, top + 43, '✕', { size: 16, fill: C.dim }))
  let y = top + 64
  parts.push(t(20, y + 10, '类型', { size: 12, fill: C.dim }))
  y += 20
  const sw = (W - 40 - 24) / 4
  ;['亲喂', '瓶喂母乳', '配方奶', '辅食'].forEach((s, i) => {
    const act = i === 2
    parts.push(rr(20 + i * (sw + 8), y, sw, 44, 14, act ? C.warm : C.line))
    parts.push(t(20 + i * (sw + 8) + sw / 2, y + 27, s, { size: 12, fill: act ? C.ink : C.text, anchor: 'middle', bold: act }))
  })
  y += 60
  parts.push(t(20, y + 10, '奶量', { size: 12, fill: C.dim }))
  y += 22
  parts.push(secondaryBtn(W / 2 - 124, y, 52, 52, '−', { size: 24 }))
  parts.push(t(W / 2 + 4, y + 33, '120', { size: 32, bold: true, anchor: 'end' }))
  parts.push(t(W / 2 + 10, y + 33, 'ml', { size: 14, fill: C.dim }))
  parts.push(secondaryBtn(W / 2 + 72, y, 52, 52, '+', { size: 24 }))
  y += 62
  ;[60, 90, 120, 150].forEach((p, i) => {
    const act = p === 120
    const cw = 56
    const cx = W / 2 - (4 * cw + 3 * 8) / 2 + i * (cw + 8)
    parts.push(rr(cx, y, cw, 38, 14, act ? C.warm : C.line))
    parts.push(t(cx + cw / 2, y + 24, String(p), { size: 13, fill: act ? C.ink : C.text, anchor: 'middle', bold: act }))
  })
  y += 54
  parts.push(t(20, y + 10, '时间(默认现在)', { size: 12, fill: C.dim }))
  y += 20
  parts.push(rr(20, y, W - 40 - 72, 44, 12, C.bg, C.line))
  parts.push(t(32, y + 28, '2026-06-12 02:31', { size: 14 }))
  parts.push(secondaryBtn(W - 84, y, 64, 44, '现在', { size: 13 }))
  y += 60
  const noteI = input(20, y, W - 40, 44, '如:吐奶一点', { placeholder: true, label: '备注(可选)' })
  parts.push(noteI.svg)
  y = noteI.bottom + 18
  parts.push(primaryBtn(20, y, W - 40, 56, '保存', 17))
  return parts.join('')
}

// ---------- 记录页 ----------
function historyRow(x, y, w, icon, text, time, last = false) {
  return [
    icon(x + 14, y + 14, C.dim),
    t(x + 46, y + 32, text, { size: 13.5 }),
    time ? t(x + w - 56, y + 32, time, { size: 11.5, fill: C.dim, anchor: 'end' }) : '',
    icons.trash(x + w - 38, y + 15, C.stone500, 0.95),
    last ? '' : `<line x1="${x + 14}" y1="${y + 54}" x2="${x + w - 14}" y2="${y + 54}" stroke="${C.line}" stroke-width="0.8"/>`,
  ].join('')
}

function historyContent() {
  const x = M, w = W - 2 * M
  const parts = [t(M + 8, 84, '记录', { size: 21, bold: true })]
  let y = 108
  parts.push(t(x + 4, y + 8, '今天 · 2026-06-12', { size: 12, fill: C.dim }))
  y += 18
  parts.push(rr(x, y, w, 54 * 4 + 2, 16, C.card))
  parts.push(historyRow(x, y + 1, w, icons.glass, '配方奶 120 ml', '02:31'))
  parts.push(historyRow(x, y + 55, w, icons.moon, '睡眠 7 小时 30 分(21:40–05:10)', '21:40'))
  parts.push(historyRow(x, y + 109, w, icons.drop, '尿布 · 尿湿', '01:12'))
  parts.push(historyRow(x, y + 163, w, icons.heart, '亲喂 15 分钟 · 含奶睡', '00:05', true))
  y += 54 * 4 + 18
  parts.push(t(x + 4, y + 8, '2026-06-11 周四', { size: 12, fill: C.dim }))
  y += 18
  parts.push(rr(x, y, w, 54 * 3 + 2, 16, C.card))
  parts.push(historyRow(x, y + 1, w, icons.ruler, '体重 7.5 kg · 身长 68 cm', ''))
  parts.push(historyRow(x, y + 55, w, icons.poop, '尿布 · 便便', '20:18'))
  parts.push(historyRow(x, y + 109, w, icons.glass, '配方奶 150 ml', '19:02', true))
  y += 54 * 3 + 16
  parts.push(rr(x, y, w, 46, 14, C.card))
  parts.push(t(x + w / 2, y + 29, '加载更早的记录(还有 21 天)', { size: 12.5, fill: C.dim, anchor: 'middle' }))
  return parts.join('')
}

// ---------- 生长曲线页 ----------
// WHO 男童体重 P3/P50/P97(0–24 月,近似值,与应用内数据一致)
const wB = [
  [2.5, 3.3, 4.3],[3.4, 4.5, 5.7],[4.4, 5.6, 7.0],[5.1, 6.4, 7.9],[5.6, 7.0, 8.6],[6.1, 7.5, 9.2],
  [6.4, 7.9, 9.7],[6.7, 8.3, 10.2],[7.0, 8.6, 10.5],[7.2, 8.9, 10.9],[7.5, 9.2, 11.2],[7.7, 9.4, 11.5],
  [7.8, 9.6, 11.8],[8.0, 9.9, 12.1],[8.2, 10.1, 12.4],[8.4, 10.3, 12.7],[8.5, 10.5, 12.9],[8.7, 10.7, 13.2],
  [8.9, 10.9, 13.5],[9.0, 11.1, 13.7],[9.2, 11.3, 14.0],[9.3, 11.5, 14.3],[9.5, 11.8, 14.5],[9.7, 12.0, 14.8],[9.8, 12.2, 15.1],
]

function growthContent() {
  const x = M, w = W - 2 * M
  const parts = [t(M + 8, 84, '生长曲线', { size: 21, bold: true })]
  let y = 102
  const sw = (w - 16) / 3
  ;['体重', '身长', '头围'].forEach((s, i) => {
    const act = i === 0
    parts.push(rr(x + i * (sw + 8), y, sw, 44, 14, act ? C.warm : C.line))
    parts.push(t(x + i * (sw + 8) + sw / 2, y + 27, s, { size: 13, fill: act ? C.ink : C.text, anchor: 'middle', bold: act }))
  })
  y += 56
  const ch = 264
  parts.push(rr(x, y, w, ch + 36, 16, C.card))
  // 绘图区
  const px = x + 38, pw = w - 54, py = y + 16, ph = ch - 14
  const X = (mo) => px + (mo / 24) * pw
  const Y = (kg) => py + ph - ((kg - 2) / (16 - 2)) * ph
  for (let mo = 0; mo <= 24; mo += 3) {
    parts.push(`<line x1="${X(mo)}" y1="${py}" x2="${X(mo)}" y2="${py + ph}" stroke="${C.line}" stroke-width="0.7" stroke-dasharray="3 3"/>`)
    parts.push(t(X(mo), py + ph + 16, String(mo), { size: 10, fill: C.dim, anchor: 'middle' }))
  }
  for (let kg = 2; kg <= 16; kg += 2) {
    parts.push(`<line x1="${px}" y1="${Y(kg)}" x2="${px + pw}" y2="${Y(kg)}" stroke="${C.line}" stroke-width="0.7" stroke-dasharray="3 3"/>`)
    parts.push(t(px - 6, Y(kg) + 3.5, String(kg), { size: 10, fill: C.dim, anchor: 'end' }))
  }
  parts.push(t(px + pw, py + ph + 28, '月龄', { size: 10, fill: C.dim, anchor: 'end' }))
  const path = (idx) => 'M' + wB.map((row, mo) => `${X(mo).toFixed(1)} ${Y(row[idx]).toFixed(1)}`).join(' L')
  parts.push(`<path d="${path(2)}" fill="none" stroke="${C.stone500}" stroke-width="1.3" stroke-dasharray="4 4"/>`)
  parts.push(`<path d="${path(1)}" fill="none" stroke="${C.dim}" stroke-width="1.5"/>`)
  parts.push(`<path d="${path(0)}" fill="none" stroke="${C.stone500}" stroke-width="1.3" stroke-dasharray="4 4"/>`)
  const baby = [[0, 3.4],[1, 4.6],[2, 5.8],[3, 6.6],[4, 7.2],[5, 7.8],[6, 8.5]]
  parts.push(`<path d="M${baby.map(([m, kg]) => `${X(m).toFixed(1)} ${Y(kg).toFixed(1)}`).join(' L')}" fill="none" stroke="${C.gold}" stroke-width="2.2"/>`)
  baby.forEach(([m, kg]) => parts.push(`<circle cx="${X(m)}" cy="${Y(kg)}" r="3.6" fill="${C.gold}"/>`))
  y += ch + 36 + 10
  parts.push(t(x + 4, y + 6, '虚线为 P3/P97,实线为 P50(男童标准);金色为糖糖的记录', { size: 10.5, fill: C.dim }))
  y += 18
  parts.push(rr(x, y, w, 88, 16, C.card))
  parts.push(rr(x, y, 2.5, 88, 1.2, C.warm, null, 0, 0.65))
  parts.push(t(x + 16, y + 22, '最近一次测量(2026-06-09)', { size: 11, fill: C.dim }))
  parts.push(t(x + 16, y + 44, '体重 8.5 kg,位于 P50–P97 之间,在同月龄常见', { size: 13 }))
  parts.push(t(x + 16, y + 64, '范围内。同月龄参考:P3 6.4 / P50 7.9 / P97 9.7 kg。', { size: 13 }))
  y += 100
  parts.push(t(W / 2, y + 12, '参考线为 WHO 标准,仅供日常参考,临床判断以儿保医生为准', { size: 10.5, fill: C.dim, anchor: 'middle' }))
  // 悬浮添加按钮
  parts.push(`<circle cx="${W - 44}" cy="${844 - 84 - 44}" r="27" fill="${C.warm}"/>`)
  parts.push(t(W - 44, 844 - 84 - 36, '＋', { size: 24, fill: C.ink, anchor: 'middle', bold: true }))
  return parts.join('')
}

// ---------- 设置页(长截图) ----------
function settingsContent(H) {
  const x = M, w = W - 2 * M
  const parts = [t(M + 8, 84, '设置', { size: 21, bold: true })]
  let y = 104

  // 宝宝档案
  parts.push(rr(x, y, w, 332, 16, C.card))
  parts.push(icons.baby(x + 14, y + 12, C.warm, 0.9))
  parts.push(t(x + 40, y + 27, '宝宝档案', { size: 15, bold: true }))
  let iy = y + 44
  const f1 = input(x + 16, iy, w - 32, 44, '糖糖', { label: '小名' })
  parts.push(f1.svg); iy = f1.bottom + 12
  const f2 = input(x + 16, iy, w - 32, 44, '2025-12-12', { label: '出生日期' })
  parts.push(f2.svg); iy = f2.bottom + 12
  parts.push(t(x + 16, iy + 10, '性别(用于 WHO 生长参考标准)', { size: 12, fill: C.dim }))
  iy += 20
  const hw = (w - 32 - 8) / 2
  parts.push(rr(x + 16, iy, hw, 44, 14, C.warm))
  parts.push(t(x + 16 + hw / 2, iy + 27, '男宝', { size: 13, fill: C.ink, anchor: 'middle', bold: true }))
  parts.push(rr(x + 24 + hw, iy, hw, 44, 14, C.line))
  parts.push(t(x + 24 + hw + hw / 2, iy + 27, '女宝', { size: 13, anchor: 'middle' }))
  iy += 56
  parts.push(rr(x + 16, iy, w - 32, 46, 16, C.warm, null, 0, 0.35))
  parts.push(t(x + w / 2, iy + 29, '保存档案', { size: 14, fill: C.ink, anchor: 'middle' }))
  y += 332 + 12

  // 数据摘要
  parts.push(rr(x, y, w, 130, 16, C.card))
  parts.push(icons.doc(x + 14, y + 12, C.warm, 0.9))
  parts.push(t(x + 40, y + 27, '数据摘要', { size: 15, bold: true }))
  parts.push(t(x + 16, y + 52, '生成最近 24 小时 / 7 天的结构化文字,可复制后发给', { size: 11, fill: C.dim }))
  parts.push(t(x + 16, y + 68, '医生,或粘贴给 AI 助手解读。', { size: 11, fill: C.dim }))
  parts.push(secondaryBtn(x + 16, y + 78, w - 32, 40, '生成摘要', { size: 13 }))
  y += 130 + 12

  // AI 解读
  parts.push(rr(x, y, w, 414, 16, C.card))
  parts.push(icons.bot(x + 14, y + 12, C.warm, 0.9))
  parts.push(t(x + 40, y + 27, 'AI 解读', { size: 15, bold: true }))
  parts.push(t(x + 16, y + 52, '用你自己的大模型 API Key 解读最近记录。Key 只保存', { size: 11, fill: C.dim }))
  parts.push(t(x + 16, y + 68, '在本机,不会进入导出备份。', { size: 11, fill: C.dim }))
  iy = y + 80
  parts.push(t(x + 16, iy + 10, '服务商', { size: 12, fill: C.dim }))
  iy += 20
  const qw = (w - 32 - 24) / 4
  ;['DeepSeek', 'Kimi', 'AnyRouter', '自定义'].forEach((s, i) => {
    const act = i === 0
    parts.push(rr(x + 16 + i * (qw + 8), iy, qw, 44, 14, act ? C.warm : C.line))
    parts.push(t(x + 16 + i * (qw + 8) + qw / 2, iy + 27, s, { size: 10.5, fill: act ? C.ink : C.text, anchor: 'middle', bold: act }))
  })
  iy += 56
  const a1 = input(x + 16, iy, w - 32, 44, 'https://api.deepseek.com', { label: '接口地址' })
  parts.push(a1.svg); iy = a1.bottom + 10
  const a2 = input(x + 16, iy, w - 32, 44, 'deepseek-chat', { label: '模型' })
  parts.push(a2.svg); iy = a2.bottom + 10
  const a3 = input(x + 16, iy, w - 32, 44, '••••••••••••', { label: 'API Key' })
  parts.push(a3.svg); iy = a3.bottom + 14
  parts.push(secondaryBtn(x + 16, iy, hw, 44, '保存配置', { size: 13 }))
  parts.push(primaryBtn(x + 24 + hw, iy, hw, 44, '生成解读', 13))
  y += 414 + 12

  // 数据备份
  parts.push(rr(x, y, w, 132, 16, C.card))
  parts.push(icons.save(x + 14, y + 12, C.warm, 0.9))
  parts.push(t(x + 40, y + 27, '数据备份', { size: 15, bold: true }))
  parts.push(t(x + 16, y + 52, '所有数据只保存在本机浏览器里,不上传任何服务器。', { size: 11, fill: C.dim }))
  parts.push(t(x + 16, y + 68, '换设备或重装前请先导出。', { size: 11, fill: C.dim }))
  parts.push(secondaryBtn(x + 16, y + 80, hw, 40, '导出 JSON', { size: 13 }))
  parts.push(secondaryBtn(x + 24 + hw, y + 80, hw, 40, '导入 JSON', { size: 13 }))
  y += 132 + 16
  parts.push(t(W / 2, y + 8, '宝宝成长记录 · 本地离线应用 · 不做医疗判断', { size: 10.5, fill: C.dim, anchor: 'middle' }))
  return parts.join('')
}

// ---------- 渲染 ----------
function render(name, svg) {
  const r = new Resvg(svg, {
    fitTo: { mode: 'zoom', value: 2 },
    font: { loadSystemFonts: true, defaultFontFamily: FONT },
  })
  writeFileSync(`${OUT}/${name}.png`, r.render().asPng())
  console.log(`${name}.png`)
}

render('01-today', frame(844, 'today', todayContent(false)))
render('02-today-sleeping', frame(844, 'today', todayContent(true)))
render('03-sheet-feed', frame(844, 'today', todayContent(false), feedSheet()))
render('04-history', frame(844, 'history', historyContent()))
render('05-growth', frame(844, 'growth', growthContent()))
render('06-settings', frame(1320, 'settings', settingsContent(1320)))
console.log('all done →', OUT)
