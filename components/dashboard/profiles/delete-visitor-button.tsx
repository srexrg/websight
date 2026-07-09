"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** GDPR erasure control for a profile (docs/redesign/07 M4). */
export function DeleteVisitorButton({
  site,
  profileKey,
  label,
}: {
  site: string;
  profileKey: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const qc = useQueryClient();

  const del = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `/api/sites/${site}/visitors/${encodeURIComponent(profileKey)}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error(`delete failed (${res.status})`);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["analytics", site] });
      router.push(`/${site}/profiles`);
    },
  });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-destructive/40 px-2.5 py-1 text-[12.5px] font-medium text-destructive hover:bg-destructive/10"
      >
        Delete data
      </button>
      <Dialog open={open} onOpenChange={(o) => !del.isPending && setOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete all data for {label}?</DialogTitle>
            <DialogDescription>
              This permanently erases every session, event, and profile record for this visitor.
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {del.isError && (
            <p className="text-[12.5px] text-destructive">Something went wrong. Try again.</p>
          )}
          <DialogFooter>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={del.isPending}
              className="rounded-md bg-secondary px-3 py-1.5 text-[13px] font-medium text-foreground hover:bg-secondary/70 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => del.mutate()}
              disabled={del.isPending}
              className="rounded-md bg-destructive px-3 py-1.5 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {del.isPending ? "Deleting…" : "Delete permanently"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
