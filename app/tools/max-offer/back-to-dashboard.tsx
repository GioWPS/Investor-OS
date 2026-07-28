"use client";

import { DASHBOARD_TAB_NAME } from "../../dashboard/tab-namer";

/**
 * "Dashboard" jump for the calculator — hops to the dashboard tab WITHOUT disturbing the
 * calculator (your in-progress work stays put on this tab).
 *
 * How: window.open("/dashboard", <name>) targets the dashboard tab by its name (the dashboard
 * sets window.name via <TabNamer/>). If that named tab already exists in this browsing context,
 * the browser reuses AND focuses it — no duplicate. If it doesn't exist, one opens with that
 * name, and repeat clicks reuse it. Either way THIS (calculator) tab is never navigated.
 *
 * Note: this only works because the dashboard opens the calculator with rel="opener" (same
 * browsing-context group). With the default target="_blank" (implicit noopener) the tabs are
 * isolated and can't find each other by name.
 */
export function BackToDashboard() {
  function go() {
    window.open("/dashboard", DASHBOARD_TAB_NAME);
  }

  return (
    <button type="button" className="btn-back no-print" onClick={go} title="Jump to your dashboard tab">
      ⧉ Dashboard
    </button>
  );
}
