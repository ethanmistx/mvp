# 宝宝成长记录(Phase 0 + Phase 1 AI 解读)

0–3 岁宝宝家庭的移动端记录工具:喂养、睡眠、尿布、生长曲线。
本地优先 PWA——所有数据只存在设备的 IndexedDB 里,无账号、无后端、无埋点、无第三方 SDK。

Phase 0 验证父母是否愿意持续记录数据;Phase 1 增加可选的 LLM 解读层
(BYOK:用户自带 API Key,支持 DeepSeek / Kimi / AnyRouter / 自定义兼容接口)。

## 技术栈

- Vite + React 18 + TypeScript + Tailwind CSS + recharts
- 持久化:Dexie(IndexedDB),所有读写经过统一的 `StorageAdapter` 接口
- PWA:vite-plugin-pwa(manifest + service worker),支持添加到主屏、完全离线使用

## 运行

```bash
pnpm install
pnpm dev        # 开发服务器
pnpm test       # vitest 单元测试(44 个用例)
pnpm typecheck  # TypeScript 检查
pnpm build      # 产物输出到 dist/(含 SW 与 manifest)
pnpm preview    # 本地预览生产构建(验证 PWA 安装与离线)
```

> PWA 的 service worker 只在生产构建中启用,验证离线能力请用 `pnpm build && pnpm preview`,
> 或部署后在手机浏览器里「添加到主屏幕」。

图标由 `node scripts/gen-icons.mjs` 生成(无依赖,产物已提交到 `public/icons/`)。

## 部署到 Vercel

1. 把仓库推到 GitHub,登录 [vercel.com](https://vercel.com) → **Add New → Project** → 选择该仓库
2. Framework Preset 选 **Vite**(自动识别);构建命令 `pnpm build`,输出目录 `dist`(均为默认值)
3. 点 **Deploy**。完成后用手机访问分配的 `*.vercel.app` 域名,
   Safari/Chrome 菜单里选「添加到主屏幕」即可像 App 一样使用
4. 后续 `git push` 自动触发重新部署;SW 为 `autoUpdate` 模式,用户下次打开自动升级

CLI 方式:`npm i -g vercel && vercel --prod`(在仓库根目录执行)。

无需任何环境变量与服务端配置——纯静态产物。

## 数据模型与导出格式

见 `src/types.ts`。导出 JSON 为 `ExportBundle`(`schemaVersion: 1`),
在设置页可整包导出/导入,清空数据后导入可完整还原。

## WHO 生长参考数据说明

`src/data/whoStandards.ts` 内置 WHO 2006 儿童生长标准 0–24 月龄 P3/P50/P97 值。
构建环境无法访问 who.int(网络策略 403),当前数值为按公开发表的 WHO 月龄表整理的
**近似值**(误差通常 ±0.1–0.2),文件头注释有详细说明。网络可用时应以官方
LMS 表重新生成。

红线:应用不做任何医疗宣称;生长曲线页固定显示
「参考线为 WHO 标准,仅供日常参考,临床判断以儿保医生为准」。

## Phase 1:AI 解读(BYOK)

设置页 →「AI 解读」:选择服务商、填入自己的 API Key 即可对最近 24h/7d
的记录生成一段克制的中文解读。

| 服务商 | 接口格式 | 默认地址 | 默认模型 |
| --- | --- | --- | --- |
| DeepSeek | OpenAI 兼容 `/chat/completions` | `https://api.deepseek.com` | `deepseek-chat` |
| Kimi(Moonshot) | OpenAI 兼容 | `https://api.moonshot.cn/v1` | `moonshot-v1-8k` |
| AnyRouter | Anthropic 兼容 `/v1/messages` | `https://anyrouter.top` | `claude-sonnet-4-20250514` |
| 自定义 | 两种格式可选 | 自填 | 自填 |

地址与模型名均可改;任何 OpenAI 或 Anthropic 兼容网关(OneAPI、OpenRouter 等)
都能以「自定义」接入。

设计与隐私约定:

- **BYOK,无中间服务器**:浏览器直接调用所选服务商,本应用不经手、不收集任何数据
- **API Key 只存本机 localStorage**,刻意不进入 `ExportBundle`,导出备份不会泄露 Key
- **发送的是统计摘要**(`generateStructuredSummary()` 的 JSON:次数/时长/奶量/生长区间),
  不含备注原文;首次发送前有一次性确认弹窗
- **红线不变**:system prompt 明确禁止诊断、恐慌措辞与用药建议,解读结尾固定
  「不构成医疗建议」;解读结果只缓存在本机
- **CORS 提示**:个别服务商的接口可能不允许浏览器直连(无 CORS 头),此时会提示
  换用支持浏览器调用的网关;Anthropic 格式请求已带
  `anthropic-dangerous-direct-browser-access: true` 头
- 本开发环境无法访问外部 API(网络策略),请求构造与错误处理由 mock 单测覆盖,
  真实联调请在部署后用自己的 Key 验证

## Phase 1 接缝点(已兑现)

1. **`src/lib/summary.ts` 的 `generateStructuredSummary(SummaryInput)`**
   ——与给人读的 `generateSummary()` 共享同一套窗口聚合函数,
   输出 JSON 作为 LLM 的 prompt 上下文(`src/lib/llm/prompt.ts` 消费)。

2. **`src/storage/index.ts` 的单例装配点**——`storage` 仍是全应用唯一的
   `StorageAdapter` 实例,后续接后端同步时在此替换实现,UI 与 hooks 无感。

3. **`ExportBundle.schemaVersion`(`src/types.ts`)**——备份格式版本号保持 v1;
   LLM 配置(含 Key)与解读缓存刻意放在 localStorage,不进备份。
