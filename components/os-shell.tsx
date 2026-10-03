"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BrandMark } from "@/components/brand-mark";
import { TOOLS, type ToolKey } from "@/lib/tools/registry";
import { LIVE_MODULES } from "@/lib/modules";
import { signOut } from "@/app/dashboard/actions";
import {
  IconBlueprint,
  IconCalculator,
  IconCoach,
  IconCompass,
  IconDashboard,
  IconMarket,
  IconMastermind,
  IconPipeline,
  IconPlaybook,
  IconReports,
} from "@/app/dashboard/icons";

/**
 * The persistent Closing Table OS frame: left sidebar + a main area. Wraps both /dashboard
 * and /tools/*, so opening the calculator or Reports swaps only the right side and the
 * sidebar stays put. Tool pages render "flush" (no dashboard padding) so their own design
 * — e.g. the Max Offer Calculator's glass background — is untouched.
 */

const TOOL_ICON: Record<ToolKey, typeof IconCalculator> = {
  max_offer: IconCalculator,
  funding_path: IconCompass,
  first_deal_blueprint: IconBlueprint,
};

const WEBINAR_URL = "https://seeyouattheclosingtable.com/webinar-signup-page";

// An href makes a module clickable; no href renders it locked with a "Soon" badge.
const osFuture: { name: string; Icon: typeof IconReports; href?: string; sameTab?: boolean }[] = [
  { name: "Lead Pipeline", Icon: IconPipeline, href: LIVE_MODULES.pipeline ? "/dashboard/pipeline" : undefined },
  { name: "AI Deal Coach", Icon: IconCoach },
  { name: "Market Watch", Icon: IconMarket, href: LIVE_MODULES.marketWatch ? "/dashboard/market-watch" : undefined },
  { name: "Playbooks", Icon: IconPlaybook },
  { name: "Reports", Icon: IconReports, href: "/tools/max-offer/history", sameTab: true },
  { name: "Mastermind", Icon: IconMastermind },
];

const navClass = (active: boolean) => (active ? "os-navitem active" : "os-navitem");

export function OsShell({
  email,
  initial,
  variant = "page",
  children,
}: {
  email: string;
  initial: string;
  /** "tool" renders the main area flush, so a tool's own full-page design shows as-is. */
  variant?: "page" | "tool";
  children: ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const isTool = variant === "tool";

  return (
    <div className="os-scope">
      <div className="os-shell">
    <aside className="os-side">
      <div className="os-sidehead">
        <div className="os-brand">
          <BrandMark />
          <div>
            <div className="os-brand-name">Closing Table OS</div>
          </div>
        </div>
        {/* Phones only: the account chip + sign out live in the pinned header. */}
        <div className="os-mobile-account">
          <span className="os-avatar os-avatar-sm" title={email}>
            {initial}
          </span>
          <form action={signOut}>
            <button type="submit" className="os-btn os-btn-ghost os-signout-sm">
              Sign out
            </button>
          </form>
        </div>
      </div>

      <div className="os-navwrap">
      <div className="os-navgroup">
        <div className="os-navlabel">Your Toolkit</div>
        <nav className="os-nav">
          <Link href="/dashboard" className={navClass(pathname === "/dashboard")}>
            <IconDashboard /> Dashboard
          </Link>
          {TOOLS.map((t) => {
            const Icon = TOOL_ICON[t.key];
            return t.status === "live" ? (
              <Link
                key={t.key}
                href={`/tools/${t.slug}`}
                className={navClass(pathname === `/tools/${t.slug}`)}
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

      <div className="os-navgroup">
        <div className="os-navlabel">Closing Table OS</div>
        <nav className="os-nav">
          {osFuture.map(({ name, Icon, href, sameTab }) =>
            href ? (
              <Link
                key={name}
                href={href}
                target={sameTab ? undefined : "_blank"}
                rel={sameTab ? undefined : "opener"}
                className={navClass(pathname.startsWith(href))}
              >
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
      </div>

      <div className="os-side-promo">
        <div className="os-kicker">
          <span className="os-live-dot" aria-hidden="true" />
          Live · Monthly
        </div>
        <h4>Get in the room</h4>
        <p>Bring your numbers to Henry and investors closing deals right now.</p>
        <a
          className="os-btn os-btn-primary os-side-promo-btn"
          href={WEBINAR_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          Join the Webinar
        </a>
      </div>
    </aside>
        <main className={isTool ? "os-main os-main--tool" : "os-main"}>{children}</main>
      </div>
    </div>
  );
}
