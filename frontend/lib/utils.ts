import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

export function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function trustColor(score: number) {
  if (score >= 70) return "var(--trust-high)";
  if (score >= 40) return "var(--trust-mid)";
  return "var(--trust-low)";
}

export function trustLabel(score: number) {
  if (score >= 80) return "강한 신뢰";
  if (score >= 65) return "안정";
  if (score >= 45) return "주의";
  return "위험";
}
