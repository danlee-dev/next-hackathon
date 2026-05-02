import { Suspense } from "react";
import { ReportView } from "./report-view";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ReportPage({ params }: Props) {
  const { id } = await params;
  return (
    <Suspense fallback={<Loading />}>
      <ReportView sessionId={id} />
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
