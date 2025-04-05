import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CodeBlockProps {
  apiKey: string;
}

export function CodeBlock({ apiKey }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const tsCode = `// TypeScript Example
const url = "https://websight-ecru.vercel.app/api/events";
const headers = {
  "Content-Type": "application/json",
  "Authorization": "Bearer ${apiKey}"
};

interface EventData {
  name: string;
  domain: string;
  description?: string;
}

const eventData: EventData = {
  name: "user_signup",    // required: event name
  domain: "example.com",  // required: your domain
  description: "User completed signup", // optional: event details
};

// Send the event
await fetch(url, {
  method: 'POST',
  headers,
  body: JSON.stringify(eventData)
});`;

  const jsCode = `// JavaScript Example
const url = "https://websight-ecru.vercel.app/api/events";
const headers = {
  "Content-Type": "application/json",
  "Authorization": "Bearer ${apiKey}"
};

const eventData = {
  name: "user_signup",    // required: event name
  domain: "example.com",  // required: your domain
  description: "User completed signup", // optional: event details
};

// Send the event
await fetch(url, {
  method: 'POST',
  headers,
  body: JSON.stringify(eventData)
});`;

  const handleCopy = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative space-y-4">
      <Tabs defaultValue="typescript" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-zinc-900/50 border border-zinc-800">
          <TabsTrigger value="typescript" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-blue-400 text-gray-300">TypeScript</TabsTrigger>
          <TabsTrigger value="javascript" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-blue-400 text-gray-300">JavaScript</TabsTrigger>
        </TabsList>
        <TabsContent value="typescript" className="relative mt-0">
          <SyntaxHighlighter
            language="typescript"
            style={oneDark}
            customStyle={{
              padding: '1rem',
              borderRadius: '0.5rem',
              margin: 0,
              background: 'rgba(24, 24, 27, 0.5)',
              border: '1px solid rgba(39, 39, 42, 0.8)',
              fontSize: '0.9rem',
              lineHeight: '1.5',
            }}
          >
            {tsCode}
          </SyntaxHighlighter>
          <Button
            size="icon"
            variant="ghost"
            className="absolute top-2 right-2 h-8 w-8 bg-zinc-800/50 hover:bg-zinc-700/50"
            onClick={() => handleCopy(tsCode)}
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4 text-gray-400" />
            )}
          </Button>
        </TabsContent>
        <TabsContent value="javascript" className="relative mt-0">
          <SyntaxHighlighter
            language="javascript"
            style={oneDark}
            customStyle={{
              padding: '1rem',
              borderRadius: '0.5rem',
              margin: 0,
              background: 'rgba(24, 24, 27, 0.5)',
              border: '1px solid rgba(39, 39, 42, 0.8)',
              fontSize: '0.9rem',
              lineHeight: '1.5',
            }}
          >
            {jsCode}
          </SyntaxHighlighter>
          <Button
            size="icon"
            variant="ghost"
            className="absolute top-2 right-2 h-8 w-8 bg-zinc-800/50 hover:bg-zinc-700/50"
            onClick={() => handleCopy(jsCode)}
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4 text-gray-400" />
            )}
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}