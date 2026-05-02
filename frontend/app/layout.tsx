import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "TrustPitch — 가상 AI 심사위원이 실시간 반응하는 IR 코칭",
  description:
    "한국어 IR 발표에 특화된 AI 코칭 서비스. 시각·음성·논리 신뢰도를 측정해 단일 신뢰 점수로 보여줍니다.",
  metadataBase: new URL("https://trustpitch.vercel.app"),
};

export const viewport: Viewport = {
  themeColor: "#0a0c10",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="min-h-dvh bg-background text-foreground antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
