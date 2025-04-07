'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CodeBlock } from "@/components/settings/CodeBlock";
import { CopyIcon, CheckIcon, KeyIcon, RefreshCwIcon } from 'lucide-react';

interface SettingsClientProps {
  userId: string;
  initialApiKey: string;
}

export default function SettingsClient({ userId, initialApiKey }: SettingsClientProps) {
  const [apiKey, setApiKey] = useState(initialApiKey);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const supabase = createClient();

  const generateApiKey = async () => {
    setIsGenerating(true);
    try {
      const randomString = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');

      const { error } = await supabase
        .from("users")
        .update([{ api: randomString, id: userId }])
        .eq("id", userId);

      if (error) throw error;
      setApiKey(randomString);
    } catch (error) {
      console.error('Error generating API key:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyApiKey = async () => {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="border-zinc-800 bg-black/50 backdrop-blur-sm">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex items-center gap-2">
            <KeyIcon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
            <CardTitle className="text-base sm:text-lg text-white font-oswald">API Key</CardTitle>
          </div>
          <CardDescription className="text-xs sm:text-sm text-gray-300 font-jakarta">
            Generate and manage your API key to track custom events
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6">
          {!apiKey ? (
            <Button 
              onClick={generateApiKey} 
              disabled={isGenerating}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm"
            >
              {isGenerating ? (
                <>
                  <RefreshCwIcon className="h-3 w-3 sm:h-4 sm:w-4 animate-spin mr-1 sm:mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <KeyIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Generate API Key
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={apiKey}
                  type="text"
                  className="font-mono text-xs sm:text-sm bg-zinc-900/50 border-zinc-800 text-gray-200"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyApiKey}
                  className="shrink-0 border-zinc-800 hover:bg-zinc-800/50 h-8 w-8 sm:h-9 sm:w-9"
                >
                  {copied ? (
                    <CheckIcon className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                  ) : (
                    <CopyIcon className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 cursor-pointer" />
                  )}
                </Button>
              </div>
              <Button 
                variant="outline" 
                onClick={generateApiKey}
                disabled={isGenerating}
                className="border-zinc-800 cursor-pointer text-black text-xs sm:text-sm"
              >
                {isGenerating ? (
                  <>
                    <RefreshCwIcon className="h-3 w-3 sm:h-4 sm:w-4 animate-spin mr-1 sm:mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <RefreshCwIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    Generate New Key
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {apiKey && (
        <Card className="border-zinc-800 bg-black/50 backdrop-blur-sm">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg text-white font-oswald">Usage Example</CardTitle>
            <CardDescription className="text-xs sm:text-sm text-gray-300 font-jakarta">
              Here&apos;s how to use your API key to track custom events
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <CodeBlock apiKey={apiKey} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}