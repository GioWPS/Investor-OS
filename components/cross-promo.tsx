import Link from "next/link";
import { nextTool, type ToolKey } from "@/lib/tools/registry";

/**
 * "You might also want to try…" — every tool's result presents the NEXT tool in the
 * sequence (Max Offer → Funding Path → Blueprint), not a menu (spec §7). Reads the
 * sequence from the registry so it can never contradict the dashboard's ordering.
 */
export function CrossPromo({ current }: { current: ToolKey }) {
  const next = nextTool(current);
  if (!next) return null;

  const isLive = next.status === "live";

  return (
    <section className="mt-10 rounded-xl border border-line bg-surface p-6">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        Next step
      </p>
      <h2 className="mt-1 text-lg font-semibold text-ink">{next.name}</h2>
      <p className="mt-1 text-sm text-muted">{next.tagline}</p>
      {isLive ? (
        <Link
          href={`/tools/${next.slug}`}
          className="mt-4 inline-block rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Try {next.name} →
        </Link>
      ) : (
        <span className="mt-4 inline-block rounded-lg bg-line px-4 py-2 text-sm font-medium text-muted">
          Coming soon
        </span>
      )}
    </section>
  );
}
