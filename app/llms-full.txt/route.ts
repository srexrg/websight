import { source } from "@/lib/source";
import { getLLMText } from "@/lib/get-llm-text";

export const revalidate = false;

export async function GET() {
  const pages = await Promise.all(source.getPages().map(getLLMText));

  return new Response(pages.join("\n\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
