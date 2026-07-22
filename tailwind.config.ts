import type { Config } from "tailwindcss";

/**
 * Brand base = the "Road to the Closing Table Free Toolkit" look (derived from Henry's
 * existing Max Offer Calculator style). Each tool layers its OWN accent color on top of
 * this shared base by setting the `--accent-*` CSS variables (see app/globals.css and the
 * per-tool layout). Tailwind reads those variables via the `accent` color below, so the
 * same components look unified but each tool is individually identifiable.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Shared brand base
        ink: "#0f172a", // primary text / dark surfaces (slate-900-ish)
        canvas: "#f8fafc", // page background
        surface: "#ffffff", // cards
        muted: "#64748b", // secondary text
        line: "#e2e8f0", // borders

        // Per-tool accent, driven by CSS variables so each tool sets its own hue.
        accent: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
          soft: "rgb(var(--accent-soft) / <alpha-value>)",
          ink: "rgb(var(--accent-ink) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "0.875rem",
      },
    },
  },
  plugins: [],
};

export default config;
