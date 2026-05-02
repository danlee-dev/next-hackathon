/**
 * TrustPitch logo mark — geometric T with a single trust-point dot beneath.
 *
 * 사이즈 16-160px 까지 깔끔하게 작동. dot 은 stem 너비와 동일하게 잡혀 비례 유지.
 * `inverted` 로 흑백 반전 (검정 배경 위 흰색 마크 → 흰색 배경 위 검정 마크).
 */

interface Props {
  size?: number;
  inverted?: boolean;
  className?: string;
}

export function LogoMark({ size = 24, inverted = false, className }: Props) {
  const surface = inverted ? "#0a0a0c" : "#ffffff";
  const ink = inverted ? "#ffffff" : "#0a0a0c";
  // 모서리 radius 는 size 에 비례 (size 24 일 때 r=6, 즉 25%).
  const r = Math.round(size * 0.25);
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      aria-label="TrustPitch"
      className={className}
    >
      <title>TrustPitch</title>
      <rect width="24" height="24" rx={(r * 24) / size} fill={surface} />
      {/* horizontal bar of T */}
      <rect x="4.6" y="6.4" width="14.8" height="2.6" rx="1.3" fill={ink} />
      {/* vertical stem */}
      <rect x="10.7" y="6.4" width="2.6" height="11.4" rx="1.3" fill={ink} />
      {/* trust-point dot beneath stem — single trust score signal */}
      <circle cx="12" cy="20" r="1.25" fill={ink} />
    </svg>
  );
}
