'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CodeBlock } from "@/components/settings/CodeBlock";
import { CopyIcon, CheckIcon } from 'lucide-react';

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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>API Key</CardTitle>
          <CardDescription>
            Generate and manage your API key to track custom events
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!apiKey ? (
            <Button 
              onClick={generateApiKey} 
              disabled={isGenerating}
            >
              {isGenerating ? 'Generating...' : 'Generate API Key'}
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={apiKey}
                  type="text"
                  className="font-mono"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyApiKey}
                  className="shrink-0"
                >
                  {copied ? (
                    <CheckIcon className="h-4 w-4" />
                  ) : (
                    <CopyIcon className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Button 
                variant="outline" 
                onClick={generateApiKey}
                disabled={isGenerating}
              >
                Generate New Key
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {apiKey && (
        <Card>
          <CardHeader>
            <CardTitle>Usage Example</CardTitle>
            <CardDescription>
              Here&apos;s how to use your API key to track custom events
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CodeBlock apiKey={apiKey} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}