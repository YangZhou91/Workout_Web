import { describe, it, expect } from "vitest";
import { parseWorkout } from "../src/parser/workout";

describe("parseWorkout (metadata layer)", () => {
  it("parses heading into date / weekday / status / type", () => {
    const w = parseWorkout(
      "### 2026-07-13（周一）✅ 腿 + 核心",
      `- 门店：宝龙旭辉乐刻
- 史密斯深蹲：55 kg × 12 × 4
- **记录总量**：3,840 kg 抗阻 + 核心 5 组
- 状态：完整记录`,
    );
    expect(w).not.toBeNull();
    expect(w!.id).toBe("2026-07-13");
    expect(w!.date).toBe("2026-07-13");
    expect(w!.weekday).toBe("周一");
    expect(w!.status).toBe("complete");
    expect(w!.type).toBe("腿 + 核心");
  });

  it("maps every status emoji", () => {
    const cases: Array<[string, "complete" | "partial" | "rest" | "planned"]> = [
      ["✅", "complete"],
      ["🟡", "partial"],
      ["💤", "rest"],
      ["⏳", "planned"],
    ];
    for (const [emoji, status] of cases) {
      const w = parseWorkout(`### 2026-07-14（周二）${emoji} 某训练`, "- 状态：x");
      expect(w!.status).toBe(status);
    }
  });

  it("defaults to complete when no emoji is present", () => {
    const w = parseWorkout("### 2026-07-14（周二）某训练", "- 状态：x");
    expect(w!.status).toBe("complete");
  });

  it("extracts gym, authorTotal, notes; keeps exercise line in rawBody", () => {
    const w = parseWorkout(
      "### 2026-07-13（周一）✅ 腿 + 核心",
      `- 门店：宝龙旭辉乐刻
- 史密斯深蹲：55 kg × 12 × 4
- **记录总量**：3,840 kg 抗阻 + 核心 5 组
- 状态：完整记录`,
    );
    expect(w!.gym).toBe("宝龙旭辉乐刻");
    expect(w!.authorTotal?.raw).toBe("3,840 kg 抗阻 + 核心 5 组");
    expect(w!.authorTotal?.groupCount).toBe(5);
    expect(w!.notes).toBe("完整记录");
    expect(w!.rawBody).toContain("史密斯深蹲：55 kg × 12 × 4");
    expect(w!.exercises).toEqual([]);
  });

  it("parses session time and duration (hours + minutes)", () => {
    const w = parseWorkout(
      "### 2026-07-19（周日）✅ 全身训练",
      `- 门店：绿地外滩乐刻
- 时间：14:33-17:59，约 3 小时 26 分钟`,
    );
    expect(w!.sessionTime).toEqual({
      start: "14:33",
      end: "17:59",
      durationMin: 206,
    });
  });

  it("parses duration given as minutes only", () => {
    const w = parseWorkout(
      "### 2026-07-25（周六）✅ 胸",
      `- 时间：21:13-22:41，约 88 分钟`,
    );
    expect(w!.sessionTime?.durationMin).toBe(88);
  });

  it("leaves gym null when no 门店 line is present", () => {
    const w = parseWorkout(
      "### 2026-07-16（周四）🟡 有氧",
      `- 跑步机：15 分钟
- 状态：部分记录`,
    );
    expect(w!.gym).toBeNull();
  });

  it("returns null when the date is unparseable", () => {
    const w = parseWorkout("### not-a-date（无效）❓ 类型", "- 门店：x");
    expect(w).toBeNull();
  });
});
