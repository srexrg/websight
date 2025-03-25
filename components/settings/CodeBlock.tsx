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
      <Tabs defaultValue="typescript">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="typescript">TypeScript</TabsTrigger>
          <TabsTrigger value="javascript">JavaScript</TabsTrigger>
        </TabsList>
        <TabsContent value="typescript" className="relative">
          <SyntaxHighlighter
            language="typescript"
            style={oneDark}
            customStyle={{
              padding: '1rem',
              borderRadius: '0.5rem',
              margin: 0,
            }}
          >
            {tsCode}
          </SyntaxHighlighter>
          <Button
            size="icon"
            variant="ghost"
            className="absolute top-2 right-2 h-8 w-8"
            onClick={() => handleCopy(tsCode)}
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </TabsContent>
        <TabsContent value="javascript" className="relative">
          <SyntaxHighlighter
            language="javascript"
            style={oneDark}
            customStyle={{
              padding: '1rem',
              borderRadius: '0.5rem',
              margin: 0,
            }}
          >
            {jsCode}
          </SyntaxHighlighter>
          <Button
            size="icon"
            variant="ghost"
            className="absolute top-2 right-2 h-8 w-8"
            onClick={() => handleCopy(jsCode)}
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}