import Link from "next/link";
import type { CSSProperties } from "react";
import type { ToolMeta } from "@/lib/tools/registry";

/**
 * Shared layout every /tools/* page renders inside. It:
 *   - applies the tool's accent color by setting the --accent* CSS variables on a wrapper
 *     (Tailwind's `accent`/`accent-soft`/`accent-ink` colors read those variables), so all
 *     tools share one component set but each looks individually branded (spec §5);
 *   - renders a consistent header (back-to-dashboard, tool name, tagline);
 *   - drops in the page's body (form + result) as children.
 *
 * This is the "shared per-tool component pattern": the consistency here is what makes
 * adding tool #4 / #5 cheap.
 */
export function ToolShell({
  tool,
  children,
}: {
  tool: ToolMeta;
  children: React.ReactNode;
}) {
  const accentStyle = {
    "--accent": tool.accent.base,
    "--accent-soft": tool.accent.soft,
    "--accent-ink": tool.accent.ink,
  } as CSSProperties;

  return (
    <div style={accentStyle} className="min-h-screen bg-canvas">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link
            href="/dashboard"
            className="text-sm text-muted hover:text-ink"
          >
            ← Dashboard
          </Link>
          <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent-ink">
            Free Toolkit
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-ink">{tool.name}</h1>
          <p className="mt-1 text-muted">{tool.tagline}</p>
        </div>
        {children}
      </main>
    </div>
  );
}
