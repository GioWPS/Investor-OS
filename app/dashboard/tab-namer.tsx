"use client";

import { useEffect } from "react";

/**
 * Gives the dashboard browser tab a stable name. That name is what lets the calculator's
 * "⧉ Dashboard" button re-focus THIS exact tab via window.open(url, name) instead of opening
 * a duplicate — the only cross-tab "focus an existing tab" mechanism browsers actually honor.
 */
export const DASHBOARD_TAB_NAME = "closingtable-dashboard";

export function TabNamer() {
  useEffect(() => {
    try {
      window.name = DASHBOARD_TAB_NAME;
    } catch {
      /* no-op */
    }
  }, []);
  return null;
}
