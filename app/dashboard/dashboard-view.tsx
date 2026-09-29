import Link from "next/link";
import type { CSSProperties } from "react";
import { TOOLS, type ToolKey } from "@/lib/tools/registry";
import { signOut } from "./actions";
import { TabNamer } from "./tab-namer";
import {
  IconBlueprint,
  IconCalculator,
  IconCheck,
  IconCoach,
  IconCompass,
  IconDashboard,
  IconLayers,
  IconMarket,
  IconMastermind,
  IconPipeline,
  IconPlaybook,
  IconReports,
} from "./icons";

const TOOL_ICON: Record<ToolKey, typeof IconCalculator> = {
  max_offer: IconCalculator,
  funding_path: IconCompass,
  first_deal_blueprint: IconBlueprint,
};

const WEBINAR_URL = "https://seeyouattheclosingtable.com/webinar-signup-page";

export interface DashboardViewProps {
  email: string;
  firstName: string;
  /** tool key -> last-run ISO date (present = completed). */
  completed: Partial<Record<ToolKey, string>>;
  totalRuns: number;
  maxOfferRuns: number;
  lastActivity?: string;
  stageShort: string;
}

export function DashboardView({
  email,
  firstName,
  completed,
  totalRuns,
  maxOfferRuns,
  lastActivity,
  stageShort,
}: DashboardViewProps) {
  const completedCount = TOOLS.filter((t) => completed[t.key]).length;
  const progressPct = Math.round((completedCount / TOOLS.length) * 100);
  const initials = firstName.slice(0, 2).toUpperCase();

  const ringStyle: CSSProperties = {
    background: `conic-gradient(var(--os-lime) 0% ${progressPct}%, rgba(255,255,255,0.08) ${progressPct}% 100%)`,
  };

  const stats: {
    icon: typeof IconCalculator;
    value: string;
    label: string;
    meta: string;
    metaText: string;
    href?: string;
  }[] = [
    { icon: IconCheck, value: `${completedCount}/${TOOLS.length}`, label: "Tools Completed", meta: "acc-lime", metaText: progressPct === 100 ? "all done" : "keep going" },
    { icon: IconCalculator, value: String(maxOfferRuns), label: "Deals Analyzed", meta: "acc-teal", metaText: "view reports →", href: "/tools/max-offer/history" },
    { icon: IconLayers, value: stageShort, label: "Investor Stage", meta: "acc-purple", metaText: "from your inputs" },
    { icon: IconReports, value: lastActivity ? new Date(lastActivity).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—", label: "Last Activity", meta: "acc-orange", metaText: `${totalRuns} total runs` },
  ];

  // "Reports" is live (deal history); the rest stay locked previews of future CTOS modules.
  const osFuture: { name: string; Icon: typeof IconReports; href?: string }[] = [
    { name: "Lead Pipeline", Icon: IconPipeline },
    { name: "AI Deal Coach", Icon: IconCoach },
    { name: "Market Watch", Icon: IconMarket },
    { name: "Playbooks", Icon: IconPlaybook },
    { name: "Reports", Icon: IconReports, href: "/tools/max-offer/history" },
    { name: "Mastermind", Icon: IconMastermind },
  ];

  return (
    <div className="os-scope">
      <TabNamer />
      <div className="os-shell">
        <aside className="os-side">
          <div className="os-brand">
            <span className="os-brand-mark">
              <IconLayers style={{ width: 20, height: 20, color: "#fff" }} />
            </span>
            <div>
              <div className="os-brand-eyebrow">The Closing Table</div>
              <div className="os-brand-name">Free Toolkit</div>
            </div>
          </div>

          <div>
            <div className="os-navlabel">Your Toolkit</div>
            <nav className="os-nav">
              <span className="os-navitem active">
                <IconDashboard /> Dashboard
              </span>
              {TOOLS.map((t) => {
                const Icon = TOOL_ICON[t.key];
                return t.status === "live" ? (
                  <Link
                    key={t.key}
                    href={`/tools/${t.slug}`}
                    target="_blank"
                    rel="opener"
                    className="os-navitem"
                  >
                    <Icon /> {t.name}
                  </Link>
                ) : (
                  <span key={t.key} className="os-navitem locked">
                    <Icon /> {t.name} <span className="os-lock">Soon</span>
                  </span>
                );
              })}
            </nav>
          </div>

          <div>
            <div className="os-navlabel">Closing Table OS</div>
            <nav className="os-nav">
              {osFuture.map(({ name, Icon, href }) =>
                href ? (
                  <Link key={name} href={href} target="_blank" rel="opener" className="os-navitem">
                    <Icon /> {name}
                  </Link>
                ) : (
                  <span key={name} className="os-navitem locked">
                    <Icon /> {name} <span className="os-lock">Soon</span>
                  </span>
                ),
              )}
            </nav>
          </div>

          <div className="os-side-promo">
            <div className="os-kicker">Live · Monthly</div>
            <h4>Get in the room</h4>
            <p>Bring your numbers to Henry and investors closing deals right now.</p>
            <a
              className="os-btn os-btn-primary"
              href={WEBINAR_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{ width: "100%", justifyContent: "center", padding: "11px 16px" }}
            >
              Join the Webinar
            </a>
          </div>
        </aside>

        <main className="os-main">
          <div className="os-topbar">
            <div className="os-userchip">
              <span className="os-avatar">{initials}</span>
              <div style={{ lineHeight: 1.2 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{email}</div>
                <div className="os-kicker">Toolkit Member</div>
              </div>
            </div>
            <form action={signOut}>
              <button type="submit" className="os-btn os-btn-ghost" style={{ padding: "10px 16px" }}>
                Sign out
              </button>
            </form>
          </div>

          <div className="os-eyebrow">— The Closing Table</div>
          <h1 className="os-title">Welcome, {firstName}.</h1>
          <p className="os-sub">
            You&apos;re building toward your first close. <b>Find it. Fund it. Close it.</b>
          </p>

          <div style={{ display: "flex", gap: 12, marginTop: 22, flexWrap: "wrap" }}>
            <Link className="os-btn os-btn-primary" href="/tools/max-offer" target="_blank" rel="opener">
              Open Max Offer Calculator →
            </Link>
            <a className="os-btn os-btn-ghost" href="#tools">
              View your tools
            </a>
          </div>

          <div className="os-grid" style={{ gridTemplateColumns: "minmax(260px, 1fr) 2fr", marginTop: 26 }}>
            <div className="os-panel" style={{ display: "flex", alignItems: "center", gap: 22 }}>
              <div className="os-ring" style={ringStyle}>
                <div className="os-ring-inner" />
                <div className="os-ring-num">
                  <b>{progressPct}</b>
                  <em>% COMPLETE</em>
                </div>
              </div>
              <div>
                <div className="os-kicker">Toolkit Progress</div>
                <div style={{ fontFamily: "var(--os-display)", fontSize: 22, textTransform: "uppercase", margin: "6px 0" }}>
                  {completedCount} of {TOOLS.length} tools
                </div>
                <p style={{ fontSize: 13, color: "var(--os-fg-2)", margin: 0, lineHeight: 1.5 }}>
                  {completedCount === 0
                    ? "Start with the Max Offer Calculator to run your first deal."
                    : completedCount === TOOLS.length
                      ? "You've run every tool — you're deal-ready."
                      : "Nice progress. Keep moving through the sequence."}
                </p>
              </div>
            </div>

            <div className="os-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
              {stats.map((s) => {
                const Icon = s.icon;
                const inner = (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className="os-stat-ico">
                        <Icon />
                      </span>
                      <span className={`os-stat-meta ${s.meta}`}>{s.metaText}</span>
                    </div>
                    <div className="os-stat-value">{s.value}</div>
                    <div className="os-stat-label">{s.label}</div>
                  </>
                );
                // Same new-tab pattern as the tool links (rel="opener" so the tab-jump works).
                return s.href ? (
                  <Link
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="opener"
                    className="os-panel"
                    style={{ color: "inherit", textDecoration: "none" }}
                    title="See every deal you've analyzed"
                  >
                    {inner}
                  </Link>
                ) : (
                  <div className="os-panel" key={s.label}>
                    {inner}
                  </div>
                );
              })}
            </div>
          </div>

          <h2 className="os-section-title" id="tools">
            Your Tools
          </h2>
          <div className="os-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
            {TOOLS.map((t) => {
              const last = completed[t.key];
              const done = !!last;
              const inner = (
                <>
                  <span className={`os-badge ${done ? "done" : ""}`}>
                    {done ? "✓ Completed" : t.status === "live" ? "Ready" : "Coming soon"}
                  </span>
                  <div className="os-tool-name">{t.name}</div>
                  <p style={{ fontSize: 13, color: "var(--os-fg-2)", margin: "2px 0 0", lineHeight: 1.5, flex: 1 }}>
                    {t.tagline}
                  </p>
                  {t.status === "live" && (
                    <div className="acc-lime" style={{ fontSize: 13, fontWeight: 700, marginTop: 8 }}>
                      {done ? "Run again →" : "Start →"}
                    </div>
                  )}
                  {done && last && (
                    <div className="os-kicker" style={{ marginTop: 4 }}>
                      Last run {new Date(last).toLocaleDateString()}
                    </div>
                  )}
                </>
              );
              return t.status === "live" ? (
                <Link
                  key={t.key}
                  href={`/tools/${t.slug}`}
                  target="_blank"
                  rel="opener"
                  className="os-tool live"
                >
                  {inner}
                </Link>
              ) : (
                <div key={t.key} className="os-tool coming">
                  {inner}
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}
