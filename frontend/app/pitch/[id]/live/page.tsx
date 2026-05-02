import { Suspense } from "react";
import { LiveSession } from "./live-session";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ title?: string }>;
}

export default async function LivePage({ params, searchParams }: Props) {
  const { id } = await params;
  const { title } = await searchParams;
  return (
    <Suspense fallback={<LoadingShell />}>
      <LiveSession sessionId={id} title={title ?? "제목 없는 피칭"} />
    </Suspense>
  );
}

function LoadingShell() {
  return (
    <main className="grid min-h-dvh place-items-center text-sm text-muted-foreground">
      loading...
    </main>
  );
}
