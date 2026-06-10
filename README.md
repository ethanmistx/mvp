# 宝宝成长记录(Phase 0)

0–3 岁宝宝家庭的移动端记录工具:喂养、睡眠、尿布、生长曲线。
本地优先 PWA——所有数据只存在设备的 IndexedDB 里,无账号、无后端、无埋点、无第三方 SDK。

Phase 0 只验证一件事:父母是否愿意持续记录数据。

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

## Phase 1(LLM 解读层)接缝点

架构上已为接入 LLM 预留三个接缝:

1. **`src/lib/summary.ts` 的 `generateSummary(SummaryInput): string`**
   ——现在输出给人读的文本,Phase 1 在旁边加一个
   `generateStructuredSummary(): object` 返回 JSON(同一 `SummaryInput`),
   作为 LLM 的 prompt 上下文;UI 上「生成摘要」按钮旁加「AI 解读」即可,
   数据采集路径零改动。

2. **`src/storage/index.ts` 的单例装配点**——`storage` 是全应用唯一的
   `StorageAdapter` 实例。接入后端同步/远程 LLM 服务时,在这里把
   `DexieAdapter` 换成「本地写 + 后台同步」的组合实现
   (接口 `get/put/delete/list/exportAll/importAll` 不变),UI 与 hooks 全部无感。

3. **`ExportBundle.schemaVersion`(`src/types.ts`)**——所有导出/导入/未来上行
   同步都带版本号。Phase 1 若扩展字段(如 LLM 解读缓存、记录的服务端 id),
   升 `schemaVersion: 2` 并在 `importAll` 入口做 v1→v2 迁移,老用户备份不丢。
