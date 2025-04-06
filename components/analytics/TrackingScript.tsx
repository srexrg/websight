"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Check, Copy, Code } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface TrackingScriptProps {
  domain: string;
}

export function TrackingScript({ domain }: TrackingScriptProps) {
  const [copied, setCopied] = useState(false);
  const scriptCode = `<script src="https://websight-ecru.vercel.app/tracker.js" data-site="${domain}"></script>`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(scriptCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Code className="h-4 w-4" />
          <span>Tracking Script</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] w-[800px] bg-black">
        <DialogHeader>
          <DialogTitle className="text-white">Tracking Script</DialogTitle>
          <DialogDescription className="text-white">
            Add this script to your website to start tracking analytics
          </DialogDescription>
        </DialogHeader>
        <div className="relative mt-4">
          <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-4">
            <pre className="text-sm font-mono text-zinc-300 w-full overflow-x-auto p-2">
              <code className="whitespace-pre-wrap break-all">
                {scriptCode}
              </code>
            </pre>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 hover:bg-zinc-800"
            onClick={copyToClipboard}
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4 text-zinc-400" />
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
