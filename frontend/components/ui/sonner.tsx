"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      theme="dark"
      position="top-right"
      toastOptions={{
        classNames: {
          toast: "bg-surface-1 text-foreground border border-border rounded-md text-sm",
          description: "text-muted-foreground text-xs",
          title: "font-medium",
        },
      }}
    />
  );
}
