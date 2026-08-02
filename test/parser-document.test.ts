import { describe, it, expect } from "vitest";
import { parseDocument } from "../src/parser/document";

const SAMPLE = `# Test Log

> 最后整理：2026-01-01
> 来源优先级备注

## 记录口径

- 规则一
- 规则二

## 计划目标

- 目标 A

## 📅 训练记录

### 2026-01-10（周五）✅ 腿 + 核心

- 门店：测试门店
- 史密斯深蹲：50 kg × 10 × 3
- **记录总量**：1,500 kg 抗阻 + 核心 5 组
- 状态：完整记录

### 2026-01-12（周日）🟡 背

- 辅助引体：30 kg 辅助 × 8
- 状态：部分记录

### not-a-date（无效标题）

- 应被丢弃并告警

## 📊 索引

| 日期 | 类型 |
|---|---|
| 01-10 | 腿 |
`;

describe("parseDocument (split layer)", () => {
  it("parses the H1 title", async () => {
    const doc = await parseDocument(SAMPLE);
    expect(doc.title).toBe("Test Log");
  });

  it("captures the leading blockquote as meta", async () => {
    const doc = await parseDocument(SAMPLE);
    expect(doc.meta.blockquote).toContain("最后整理");
    expect(doc.meta.blockquote).toContain("来源优先级");
  });

  it("keeps non-workout sections and excludes the 训练记录 container", async () => {
    const doc = await parseDocument(SAMPLE);
    const headings = doc.documentSections.map((s) => s.heading);
    expect(headings).toEqual(["记录口径", "计划目标", "📊 索引"]);
    expect(headings).not.toContain("训练记录");
  });

  it("renders section bodies to non-empty HTML (tables included)", async () => {
    const doc = await parseDocument(SAMPLE);
    const index = doc.documentSections.find((s) => s.heading === "📊 索引");
    expect(index?.html).toContain("<table>");
    const rules = doc.documentSections.find((s) => s.heading === "记录口径");
    expect(rules?.html).toContain("<ul>");
  });

  it("extracts dated ### workouts and drops unparseable dates", async () => {
    const doc = await parseDocument(SAMPLE);
    expect(doc.workouts).toHaveLength(2);
    expect(doc.workouts.map((w) => w.date)).toEqual([
      "2026-01-10",
      "2026-01-12",
    ]);
  });

  it("orders workouts by date", async () => {
    const reversed = SAMPLE.replace(
      "### 2026-01-10（周五）✅ 腿 + 核心",
      "### 2026-01-12（周日）✅ 第一",
    ).replace("### 2026-01-12（周日）🟡 背", "### 2026-01-10（周五）🟡 第二");
    const doc = await parseDocument(reversed);
    expect(doc.workouts.map((w) => w.date)).toEqual([
      "2026-01-10",
      "2026-01-12",
    ]);
  });
});
