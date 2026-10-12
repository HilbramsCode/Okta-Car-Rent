import type { ReactNode } from "react";

import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}

export function PageHeader({
  judul,
  deskripsi,
}: {
  judul: string;
  deskripsi?: string;
}) {
  return (
    <div className="border-b border-border bg-secondary">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">{judul}</h1>
        {deskripsi ? (
          <p className="mt-3 max-w-2xl text-lg text-muted-foreground">{deskripsi}</p>
        ) : null}
      </div>
    </div>
  );
}