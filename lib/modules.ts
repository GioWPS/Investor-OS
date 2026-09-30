/**
 * Built modules that aren't public yet. While a flag is false:
 *   - the dashboard sidebar shows the module locked ("Soon") and nothing links to it
 *   - its page redirects to /dashboard, and its API route / server actions refuse
 * Flip to true to launch. Pure module — safe to import from server or client code.
 */
export const LIVE_MODULES = {
  pipeline: false,
  marketWatch: false,
} as const;
