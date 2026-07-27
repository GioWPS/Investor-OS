/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV === "development";

const nextConfig = {
  reactStrictMode: true,

  /**
   * DEV-ONLY cache busting.
   *
   * In development we tell the browser never to cache anything, so a running dev server
   * never hands you a stale stylesheet or JS chunk (the "unstyled page" / __webpack_require__
   * errors we hit came from Safari caching old dev chunks). This costs a little dev load speed
   * and does nothing in production.
   *
   * In PRODUCTION this returns no custom headers — Next serves content-hashed, immutable assets,
   * which the browser SHOULD cache. New deploys get new hashes, so there's never a stale-asset
   * problem for real users. Do not apply no-store in prod; it would throw away that caching.
   */
  async headers() {
    if (!isDev) return [];
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
