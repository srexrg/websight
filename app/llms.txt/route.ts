import { source } from "@/lib/source";
import { DATA } from "@/data/site.config";

export const revalidate = false;

export function GET() {
  const docsIndex = source
    .getPages()
    .map((page) => {
      const description = page.data.description
        ? `: ${page.data.description}`
        : "";
      return `- [${page.data.title}](${DATA.url}${page.url}.md)${description}`;
    })
    .join("\n");

  const body = `# ${DATA.name}

> ${DATA.description} WebSight is open-source (MIT), cookieless, realtime web analytics you can self-host: a privacy-first alternative to Google Analytics with session replay, funnels, goals, retention cohorts, Core Web Vitals, and a live 3D visitor globe.

- [Website](${DATA.url})
- [Documentation](${DATA.url}/docs)
- [WebSight vs Google Analytics](${DATA.url}/compare/google-analytics)
- [WebSight vs Plausible](${DATA.url}/compare/plausible)
- [WebSight vs Umami](${DATA.url}/compare/umami)
- [GitHub](https://github.com/srexrg/websight)
- [npm package](https://www.npmjs.com/package/websight)

Every documentation page below is also available as raw Markdown by appending .md to its URL. The full documentation in one file: [llms-full.txt](${DATA.url}/llms-full.txt)

## Documentation

${docsIndex}
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
