// 生成 PWA 图标:无依赖,手工编码 PNG(zlib 为 Node 内置)。
// 图案:深色暖夜底 + 金色月牙 + 星点,与应用配色一致。
// 运行:node scripts/gen-icons.mjs
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public', 'icons')
mkdirSync(outDir, { recursive: true })

const BG = [0x1c, 0x19, 0x17] // night-bg
const MOON = [0xfb, 0xbf, 0x24] // warm amber
const STAR = [0xfc, 0xd3, 0x4d]

function crc32(buf) {
  let c
  const table = []
  for (let n = 0; n < 256; n++) {
    c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  let crc = 0xffffffff
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function encodePng(size, pixels) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  // 每行前加 filter byte 0
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/** 画一张 size×size 的月牙图;scale 控制图案占比(maskable 需要留 20% 安全区) */
function drawIcon(size, scale) {
  const px = Buffer.alloc(size * size * 4)
  const cx = size / 2
  const cy = size / 2
  const r = (size / 2) * scale // 月亮半径
  // 减去的偏移圆制造月牙
  const bx = cx + r * 0.45
  const by = cy - r * 0.25
  const br = r * 0.85
  // 星点
  const stars = [
    [cx + r * 0.55, cy - r * 0.6, size * 0.025],
    [cx + r * 0.85, cy - r * 0.15, size * 0.016],
  ]
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      let color = BG
      const dMoon = Math.hypot(x - cx, y - cy)
      const dBite = Math.hypot(x - bx, y - by)
      if (dMoon < r && dBite > br) color = MOON
      for (const [sx, sy, sr] of stars) {
        if (Math.hypot(x - sx, y - sy) < sr) color = STAR
      }
      px[i] = color[0]
      px[i + 1] = color[1]
      px[i + 2] = color[2]
      px[i + 3] = 255
    }
  }
  return encodePng(size, px)
}

writeFileSync(join(outDir, 'icon-192.png'), drawIcon(192, 0.78))
writeFileSync(join(outDir, 'icon-512.png'), drawIcon(512, 0.78))
writeFileSync(join(outDir, 'icon-maskable-512.png'), drawIcon(512, 0.6)) // 安全区内
writeFileSync(join(outDir, 'apple-touch-icon.png'), drawIcon(180, 0.78))
console.log('icons written to public/icons/')
