# 🌙 宝宝成长记录

**English version: [README.en.md](./README.en.md)**

0–3 岁宝宝家庭的移动端记录工具:喂养、睡眠、尿布、生长曲线。

**本地优先 PWA** —— 所有数据只存在你自己设备的 IndexedDB 里。无账号、无后端、无埋点、无第三方 SDK;断网完全可用,可"添加到主屏幕"当 App 用。可选的 AI 解读层采用 BYOK 模式(自带 API Key),支持 DeepSeek / Kimi / AnyRouter 及任意 OpenAI / Anthropic 兼容网关。

为深夜单手操作设计:深色暖夜配色、≥44px 大点击区、核心操作 ≤2 次点击。

## 界面预览

> 原型效果图,与应用真实设计 token(配色/圆角/布局)一致;图中以矢量图标示意应用内的 emoji。

| 今日(首页) | 睡眠进行中 | 喂养记录弹层 |
| :---: | :---: | :---: |
| ![今日页](docs/mockups/01-today.png) | ![睡眠中](docs/mockups/02-today-sleeping.png) | ![喂养弹层](docs/mockups/03-sheet-feed.png) |

| 记录(按日分组) | 生长曲线(WHO) | 设置 |
| :---: | :---: | :---: |
| ![记录页](docs/mockups/04-history.png) | ![生长曲线](docs/mockups/05-growth.png) | ![设置页](docs/mockups/06-settings.png) |

深色为默认(深夜场景),支持浅色与跟随系统,设置页一键切换:

| 浅色 · 今日 | 浅色 · 生长曲线 | 浅色 · 喂养弹层 |
| :---: | :---: | :---: |
| ![浅色今日](docs/mockups/light-01-today.png) | ![浅色生长](docs/mockups/light-05-growth.png) | ![浅色弹层](docs/mockups/light-03-sheet-feed.png) |

## 功能

- **喂养**:亲喂 / 瓶喂母乳 / 配方奶 / 辅食快捷记录;奶量步进 ±10 带 60/90/120/150 预设,默认记住上次同类型的量;今日次数 / 总奶量 / 距上次
- **睡眠**:大按钮开始 / 结束,进行中柔和呼吸光 + 秒级实时计时;手动补记;跨夜睡眠整段归属入睡日;今日总时长 / 段数 / 最长一段
- **换尿布**:尿湿 / 便便 / 混合三个大按钮一键落库,按钮原地反馈"已记录 ✓"
- **生长曲线**:体重 / 身长 / 头围切换;WHO 2006 标准 P3 / P50 / P97 参考线(按性别)+ 宝宝散点连线,x 轴为月龄;最近一次测量给出所处区间的文字说明
- **留存设计**:首页显示「出生第 N 天 · X 个月 Y 天」与「已连续记录 N 天」(当天未记录不打断连续,从昨天起算)
- **主题**:深色(默认)/ 浅色 / 跟随系统三档切换;全部语义色走 CSS 变量,原生控件与图表同步换肤
- **数据主权**:一键导出 / 导入完整 JSON 备份(导入前严格校验、二次确认);「生成摘要」输出最近 24h / 7d 结构化文本,可复制给医生或粘贴给任何 AI
- **AI 解读(可选)**:用你自己的 Key 调用大模型,对最近记录生成一段克制的中文解读
- 全部记录支持增删改,删除需二次确认

## 技术架构

| 层 | 选型 |
| --- | --- |
| 框架 | Vite + React 18 + TypeScript(无状态管理库,hooks 足够) |
| 样式 | Tailwind CSS,深色暖夜主题 |
| 图表 | recharts(按需懒加载,首屏 gzip ≈ 90 KB) |
| 持久化 | Dexie(IndexedDB),所有读写经过统一 `StorageAdapter` 接口 |
| PWA | vite-plugin-pwa(manifest + Service Worker 预缓存,离线可用) |
| LLM | 纯 `fetch` 直连,统一 OpenAI(`/chat/completions`)与 Anthropic(`/v1/messages`)两种格式,零 SDK |

```
src/
├── types.ts            # 数据模型(即导出 JSON 的 schema,schemaVersion 版本化)
├── storage/            # StorageAdapter 接口 + DexieAdapter 实现(单例装配点)
├── lib/                # 纯函数:日期/月龄、WHO 插值与区间、聚合统计、摘要、备份校验
│   └── llm/            # 服务商预设、请求客户端、提示词、本机配置持久化
├── hooks/              # useCollection / useProfile / useNow(轻量事件总线)
├── components/         # 模块区块、编辑弹层、共享 UI 原语、Toast
└── pages/              # 今日 / 记录 / 生长 / 设置 + 首次引导
```

数据模型:`BabyProfile` / `Feed` / `Sleep`(`end=null` 表示进行中)/ `Growth` / `Diaper`,字段见 `src/types.ts`。

## 快速开始

```bash
pnpm install
pnpm dev        # 开发服务器(SW 不启用)
pnpm test       # vitest,75 个用例
pnpm typecheck  # TypeScript 检查
pnpm build      # 产物输出 dist/(含 manifest 与 SW)
pnpm preview    # 本地预览生产构建,验证 PWA 离线与安装
```

> 验证离线:`pnpm build && pnpm preview` → DevTools → Network 勾选 Offline → 刷新,增删改查应全部可用。

PWA 图标由 `node scripts/gen-icons.mjs` 生成(零依赖,产物已提交);界面原型图由脚本生成于 `docs/mockups/`。

## 部署(Vercel)

1. 登录 [vercel.com](https://vercel.com) → **Add New → Project** → 导入本仓库
2. Framework Preset 自动识别为 **Vite**(构建 `pnpm build`、输出 `dist`,均为默认值,无需环境变量)
3. **Deploy**。手机访问分配的域名,浏览器菜单「添加到主屏幕」即可
4. 之后 `git push` 自动重新部署;SW 为 autoUpdate,用户下次打开自动升级

Netlify / Cloudflare Pages 同理(纯静态产物,唯一硬要求是 HTTPS)。

**注意**:数据存在每台设备本地,换设备前先在设置页导出 JSON,新设备导入即可完整还原。

## AI 解读(BYOK)

设置 → AI 解读:选服务商、填自己的 API Key 即可。

| 服务商 | 接口格式 | 默认地址 | 默认模型 |
| --- | --- | --- | --- |
| DeepSeek | OpenAI 兼容 | `https://api.deepseek.com` | `deepseek-chat` |
| Kimi(Moonshot) | OpenAI 兼容 | `https://api.moonshot.cn/v1` | `moonshot-v1-8k` |
| AnyRouter | Anthropic 兼容 | `https://anyrouter.top` | `claude-sonnet-4-20250514` |
| 自定义 | 两种格式可选 | 自填 | 自填 |

地址与模型名均可改;OneAPI、OpenRouter 等任意兼容网关都能以「自定义」接入。各服务商配置分桶保存,切换不互相覆盖。

隐私约定:

- **BYOK,无中间服务器**:浏览器直连所选服务商,本应用不经手、不收集任何数据
- **API Key 只存本机 localStorage**,刻意不进入导出备份,分享备份不会泄露 Key
- 发送的是**统计摘要**(次数 / 时长 / 奶量 / 生长区间),不含备注原文;首次发送有一次性确认
- 提示词明确禁止诊断、恐慌措辞与用药建议;解读结尾固定"不构成医疗建议"
- 个别服务商接口可能不允许浏览器直连(CORS),应用会明确提示,换支持的网关即可

## WHO 生长参考数据说明

`src/data/whoStandards.ts` 内置 WHO 2006 儿童生长标准 0–24 月龄 P3/P50/P97 值。构建环境无法访问 who.int,当前数值为按公开发表的 WHO 月龄表整理的**近似值**(误差通常 ±0.1–0.2),文件头注释有详细说明;网络可用时应以官方 LMS 表重新生成。

**红线**:本应用不做任何医疗宣称。生长曲线页固定显示——参考线为 WHO 标准,仅供日常参考,临床判断以儿保医生为准。

## 工程质量

- 75 个 vitest 用例:日期/月龄计算、WHO 插值与区间判断、跨夜睡眠归属、连续打卡、摘要双窗口聚合、备份校验、LLM 请求构造与错误处理、提示词红线,以及 jsdom 端到端冒烟(引导 → 记录 → 统计 → 删除确认)
- 数据层与 UI 分离;全部日期/统计逻辑为可单测纯函数
- 动效尊重 `prefers-reduced-motion`;触控目标 ≥44px;原生控件全局深色

## Phase 1 接缝点(已兑现)

1. **`src/lib/summary.ts` 的 `generateStructuredSummary(SummaryInput)`** —— 与给人读的 `generateSummary()` 共享同一套窗口聚合函数,输出 JSON 作为 LLM 的 prompt 上下文(`src/lib/llm/prompt.ts` 消费)。
2. **`src/storage/index.ts` 的单例装配点** —— `storage` 是全应用唯一的 `StorageAdapter` 实例,后续接后端同步时在此替换实现,UI 与 hooks 无感。
3. **`ExportBundle.schemaVersion`(`src/types.ts`)** —— 备份格式版本化;LLM 配置(含 Key)与解读缓存刻意放 localStorage,不进备份。
