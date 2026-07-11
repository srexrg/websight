import { RootProvider } from "fumadocs-ui/provider/next";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";
import { source } from "@/lib/source";
import { baseOptions } from "@/lib/layout.shared";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    // Theme is disabled here because app/layout.tsx already provides a single
    // next-themes ThemeProvider (attribute="class"), and Fumadocs' dark styles
    // key off the same .dark class. Two providers would fight over the class.
    <RootProvider theme={{ enabled: false }}>
      <div className="flex min-h-screen flex-col">
        <DocsLayout tree={source.getPageTree()} {...baseOptions()}>
          {children}
        </DocsLayout>
      </div>
    </RootProvider>
  );
}
