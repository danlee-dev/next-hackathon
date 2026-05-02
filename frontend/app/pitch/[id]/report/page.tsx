import { Suspense } from "react";
import { ReportView } from "./report-view";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ demo?: string }>;
}

export default async function ReportPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  return (
    <Suspense fallback={<Loading />}>
      <ReportView
        sessionId={id}
        demoMode={sp.demo === "1" || sp.demo === "true"}
      />
    </Suspense>
  );
}

function Loading() {
  return (
    <main className="grid min-h-dvh place-items-center text-sm text-muted-foreground">
      loading report...
    </main>
  );
}
