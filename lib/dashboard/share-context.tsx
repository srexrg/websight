"use client";

import { createContext, useContext } from "react";

/**
 * Provided by the public /share/[token] shell so the standard analytics hooks
 * (useDashboardParams -> every fetcher) append `?share=<token>`, letting the
 * exact same dashboard screens run under share-token auth. Null on the member
 * dashboard, where session auth applies instead.
 */
export const ShareContext = createContext<{ token: string; readOnly: boolean } | null>(null);

export function useShareToken(): string | null {
  return useContext(ShareContext)?.token ?? null;
}

export function useReadOnly(): boolean {
  return useContext(ShareContext)?.readOnly ?? false;
}
