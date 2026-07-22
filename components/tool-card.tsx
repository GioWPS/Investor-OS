import Link from "next/link";
import type { CSSProperties } from "react";
import type { ToolMeta } from "@/lib/tools/registry";

/**
 * Dashboard card for one tool. Shows the tool's accent, its place in the sequence, whether
 * the user has completed it (a saved result exists), and links into it when it's live.
 */
export function ToolCard({
  tool,
  completed,
  lastResultAt,
}: {
  tool: ToolMeta;
  completed: boolean;
  lastResultAt?: string | null;
}) {
  const accentStyle = {
    "--accent": tool.accent.base,
    "--accent-soft": tool.accent.soft,
    "--accent-ink": tool.accent.ink,
  } as CSSProperties;

  const isLive = tool.status === "live";

  const body = (
    <div
      style={accentStyle}
      className={`flex h-full flex-col rounded-xl border border-line bg-surface p-6 transition ${
        isLive ? "hover:border-accent hover:shadow-sm" : "opacity-70"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent-ink">
          {tool.order}
        </span>
        {completed ? (
          <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent-ink">
            ✓ Completed
          </span>
        ) : isLive ? (
          <span className="text-xs font-medium text-muted">Not started</span>
        ) : (
          <span className="text-xs font-medium text-muted">Coming soon</span>
        )}
      </div>

      <h3 className="mt-4 text-lg font-semibold text-ink">{tool.name}</h3>
      <p className="mt-1 flex-1 text-sm text-muted">{tool.tagline}</p>

      {isLive && (
        <span className="mt-4 text-sm font-medium text-accent-ink">
          {completed ? "View or redo →" : "Start →"}
        </span>
      )}
      {completed && lastResultAt && (
        <span className="mt-2 text-xs text-muted">
          Last run {new Date(lastResultAt).toLocaleDateString()}
        </span>
      )}
    </div>
  );

  if (!isLive) return body;

  return (
    <Link href={`/tools/${tool.slug}`} className="block h-full">
      {body}
    </Link>
  );
}
