import type { NextConfig } from "next";

function apiUpstream(): string | null {
  const explicit = (process.env.API_UPSTREAM ?? '').trim();
  if (explicit && /^https?:\/\//.test(explicit) && !/localhost|127\.0\.0\.1/.test(explicit)) {
    return explicit.replace(/\/+$/, '');
  }

  const publicUrl = (process.env.NEXT_PUBLIC_API_URL ?? '').trim();
  if (publicUrl && /^https?:\/\//.test(publicUrl) && !/localhost|127\.0\.0\.1/.test(publicUrl)) {
    return publicUrl.replace(/\/api\/?$/, '').replace(/\/+$/, '');
  }

  // Local Next.js proxies /api/* to the Express process so the browser stays same-origin.
  if (process.env.NODE_ENV !== 'production') {
    return 'http://127.0.0.1:4000';
  }

  return null;
}

const nextConfig: NextConfig = {
  // Next 16 writes AGENTS.md on every `next dev` unless this is off.
  agentRules: false,
  // Turbopack needs framer-motion bundled directly (ESM internal imports issue)
  transpilePackages: ['framer-motion', '@paper-design/shaders-react', 'reaviz', 'motion'],
  async rewrites() {
    const upstream = apiUpstream();
    if (!upstream) {
      return [];
    }

    return [{ source: '/api/:path*', destination: `${upstream}/api/:path*` }];
  },
};

export default nextConfig;
