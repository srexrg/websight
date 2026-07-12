"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { DotsThree, Plus, Trash } from "@phosphor-icons/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sparkline } from "@/components/dashboard/metric-card";
import { AddSiteDialog } from "@/components/dashboard/add-site-dialog";
import { formatNumber } from "@/lib/dashboard/format";
import { deleteSite } from "@/app/(app)/dashboard/actions";

export type SiteCard = {
  public_id: string;
  name: string;
  domains: string[];
  visitors7d: number;
  spark: number[];
};

export function SitesGrid({ sites }: { sites: SiteCard[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  // Optimistically removed sites: hidden from the grid the instant the user
  // confirms, restored only if the server action fails.
  const [removed, setRemoved] = useState<Set<string>>(new Set());

  const onDelete = (publicId: string) => {
    setError(null);
    setRemoved((prev) => new Set(prev).add(publicId));
    startTransition(async () => {
      const res = await deleteSite(publicId);
      if (res.error) {
        setRemoved((prev) => {
          const next = new Set(prev);
          next.delete(publicId);
          return next;
        });
        setError(res.error);
      } else {
        router.refresh();
      }
    });
  };

  const visible = sites.filter((s) => !removed.has(s.public_id));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3.5 text-[13px] font-semibold text-white hover:bg-[#0B7E58]"
        >
          <Plus size={14} weight="bold" /> Add site
        </button>
        {error && <span className="text-[12.5px] font-medium text-danger">{error}</span>}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card px-6 py-14 text-center shadow-[0_1px_2px_rgba(16,24,40,.04)]">
          <p className="text-[14.5px] font-semibold text-foreground">Add your first site</p>
          <p className="mx-auto mt-1 max-w-sm text-[12.5px] text-muted-foreground">
            Click the Add site button, paste the one-line snippet, and data starts flowing in
            seconds.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((s) => (
            <div
              key={s.public_id}
              className="group relative rounded-2xl border border-border bg-card p-[18px] shadow-[0_1px_2px_rgba(16,24,40,.04)] transition-shadow hover:shadow-[0_4px_14px_rgba(16,24,40,.08)]"
            >
              <Link href={`/${s.public_id}/overview`} className="absolute inset-0" aria-label={s.name} />
              <div className="flex items-center gap-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(s.domains[0] ?? "")}&sz=64`}
                  alt=""
                  className="h-6 w-6 rounded"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold text-foreground">{s.name}</p>
                  <p className="truncate text-[11.5px] text-muted-foreground">{s.domains[0]}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="relative z-10 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-secondary group-hover:opacity-100"
                      aria-label="Site actions"
                    >
                      <DotsThree size={18} weight="bold" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => setConfirmDelete({ id: s.public_id, name: s.name })}
                      className="gap-2 text-danger focus:text-danger"
                    >
                      <Trash size={14} /> Delete site
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="mt-4 flex items-end justify-between gap-3">
                <div>
                  <p className="font-mono text-[21px] font-semibold leading-none tracking-[-.5px] text-foreground">
                    {formatNumber(s.visitors7d)}
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-muted-foreground">
                    visitors · last 7 days
                  </p>
                </div>
                <div className="w-28">
                  {s.spark.some((v) => v > 0) && <Sparkline data={s.spark} className="h-9 w-full" />}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddSiteDialog open={addOpen} onOpenChange={setAddOpen} onCreated={() => router.refresh()} />

      <AlertDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {confirmDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the site and all of its analytics data. This cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-danger text-white hover:bg-danger/90"
              onClick={() => {
                if (confirmDelete) onDelete(confirmDelete.id);
                setConfirmDelete(null);
              }}
            >
              Delete site
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
