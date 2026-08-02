import type { Status } from "../types";

const STATUS_LABELS: Record<Status, string> = {
  complete: "完整",
  partial: "部分",
  rest: "休息",
  planned: "计划",
};

export function statusLabel(status: Status): string {
  return STATUS_LABELS[status];
}

// "206" → "3 小时 26 分钟"; "88" → "88 分钟"; "60" → "1 小时".
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} 分钟`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} 小时` : `${h} 小时 ${m} 分钟`;
}
