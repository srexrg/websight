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
  domain?: string;
}

export function TrackingScript({ domain }: TrackingScriptProps) {
  const [copied, setCopied] = useState(false);
  const scriptCode = `<script src="https://websight.srexrg.me/tracker.js" data-site="${domain || 
    'Your Site'
  }"></script>`;

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
    <Dialog >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="bg-zinc-900/80 hover:bg-zinc-800/90 text-gray-300 hover:text-white border-zinc-700 hover:border-blue-500/50 transition-all duration-300 cursor-pointer">
          <Code className="h-4 w-4" />
          <span className="font-oswald">Tracking Script</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] w-[800px] bg-black">
        <DialogHeader>
          <DialogTitle className="text-white font-oswald">Tracking Script</DialogTitle>
          <DialogDescription className="text-white font-jakarta">
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
