/**
 * Renders an error stack as escaped monospace text. React escapes text children
 * by default, so error messages/stacks (attacker-influenceable) are never
 * interpreted as HTML - do NOT switch this to dangerouslySetInnerHTML.
 */
export function StackView({ stack, message }: { stack: string | null; message?: string | null }) {
  const lines = (stack ?? "").split("\n").map((l) => l.replace(/\s+$/, ""));
  return (
    <pre className="max-h-72 overflow-auto rounded-lg border border-border bg-secondary/40 p-3 text-[11.5px] leading-relaxed">
      {message && <div className="mb-1 font-semibold text-foreground">{message}</div>}
      {lines.map((l, i) => (
        <div key={i} className={/^\s*at\s/.test(l) ? "text-muted-foreground" : "text-foreground"}>
          {l || " "}
        </div>
      ))}
    </pre>
  );
}
