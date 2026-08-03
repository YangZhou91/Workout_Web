# 🏋️ Workout Web

把一份手写的 Markdown 训练日志（`public/training-log.md`）发布为静态站点：按日期浏览、搜索筛选，并给出诚实的进度分析（容量趋势、各动作 PR、强度估计）。部署在 GitHub Pages。

- 站点：<https://yangzhou91.github.io/Workout_Web/>
- 源日志（canonical）：`E:\Codex\futu_qlib\openclaw\training-log.md`，发布时复制到 `public/training-log.md`。

## 技术栈

Astro 7（静态输出）· TypeScript · unified/remark/rehype（Markdown→HTML）· Chart.js 4（仅在 `/analytics` 懒加载）· Vitest 4。

## 本地开发

需要 **Node ≥ 22.12**（Astro 7 要求）。

```bash
npm install
npm run dev      # http://localhost:4321
```

## 常用命令

```bash
npm run dev              # 开发服务器
npm run build            # 构建静态产物到 dist/
npm run preview          # 本地预览生产构建
npm run test             # 全部测试（解析器 + 分析 + 快照 + 构建冒烟）
npm run test:parser      # 仅解析器变体测试
npm run test:snapshot    # 仅真实日志快照
```

## 测试

`vitest` 覆盖最高风险路径（解析器与分析——错误的求和会污染展示数字）：

- `test/parser-sets.test.ts` — V1–V15 每种记法变体 + 记录口径
- `test/parser-document.test.ts` / `test/parser-workout.test.ts` — 文档拆分与训练日元数据
- `test/analytics.test.ts` — 容量 / PR / 趋势 / 跨门店告警的不变量
- `test/snapshot.test.ts` — 真实日志的结构化快照
- `test/build-smoke.test.ts` — 跑真实构建，断言每个训练日页面都生成、无训练日被丢弃

改了记法或日志内容导致快照变化时，审查后用 `npx vitest run -u` 接受。

## 部署（GitHub Pages）

- 推送 `main` → `.github/workflows/deploy-pages.yml` 构建 `dist/` 并部署；`.github/workflows/test.yml` 在 push/PR 上跑测试并作为部署门禁。
- 项目页路径在 `astro.config.mjs` 配置：`site: https://yangzhou91.github.io`、`base: /Workout_Web`。站内所有 `<a href>` 经 `src/util/url.ts` 的 `path()` 解析到 base 下（Astro 只自动前缀打包资源，不前缀手写链接）。
- GitHub Pages 设置为「deploy from GitHub Actions」。

## 架构

三层解析器（research R2）：

1. **document**（`src/parser/document.ts`）— 把日志拆成文档章节（计划目标 / 基线 / 记录口径 / 索引 / 复盘）与 `###` 训练日。
2. **workout**（`src/parser/workout.ts`）— 解析训练日元数据（门店 / 时间 / 状态 / 记录总量），并把动作行交给第 3 层。
3. **sets**（`src/parser/sets.ts` + `normalize.ts` + `conventions.ts`）— 按目录识别 V1–V15 每种记法，归一化为 `WorkSet[]`，带上辅助 / 自重 / 排除 / 低置信度标记。

分析在构建时由 `src/analytics/`（`volume` / `pr` / `trends`）计算，按门店分段，排除项单独标注。数据经 `src/data/log.ts` 与 `src/data/analytics.ts` 在页面 frontmatter 里就地加载（无 CLI / JSON 中间产物）。

## 记录口径摘要

分析遵循作者自定的记录口径（FR-017/018/020），保证每个数字都可追溯到源行：

- **lb → kg**：×0.45359237；保留 `originalWeight`（如 `"85 lb"`）。
- **单边 `/边`、`单边`**：有效总负重 = 记录值 × 2（容量、PR、1RM 三处一致）。
- **辅助 `辅助`**：记录的是辅助（配重）值；净拉 = 体重 − 辅助，因体重基线不可靠，**不计入抗阻容量**，单独列出。
- **自重动作**（引体 / 悬垂举腿 / 波比跳 / 退阶波比跳 / 平板 / 臂屈伸）：不计 kg 容量，只计组数 / 次数。
- **推测 / 不计入**：整段标记 `excluded`，排除在所有统计之外；行尾的排除小句会回溯标记前面的组（contract §2）。
- **范围 / 汇总**（如 `18-32 kg … 约 11 组`、`4 组，44 次，最高 50 kg`）：缺逐组数据，标记 `lowConfidence`，排除在容量之外。
- **杠铃**：作者记录的是总负重（杆+片），解析器不再额外加 20 kg 杆重。
- **未识别行**：按 SC-011 原文保留并渲染，排除在统计之外，并在构建报告里列出。

## 数据完整性

构建报告（首页 `BuildReport`）会列出未识别 / 低置信度的动作行，供作者复核——绝不会静默错求和。
