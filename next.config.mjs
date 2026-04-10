/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  typescript: {
    tsconfigPath: 'tsconfig.build.json',
  },
  images: {
    // 开发环境禁用长期缓存，生产环境使用 1 小时
    minimumCacheTTL: process.env.NODE_ENV === 'production' ? 3600 : 0,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.google.com',
      },
    ],
  },
  pageExtensions: ['ts', 'tsx', 'mdx'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value:
              'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
        ],
      },
      {
        source: '/admin/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
      // 开发环境：静态图片禁用缓存
      ...(process.env.NODE_ENV !== 'production'
        ? [
            {
              source: '/images/:path*',
              headers: [
                {
                  key: 'Cache-Control',
                  value: 'no-store, no-cache, must-revalidate',
                },
              ],
            },
          ]
        : []),
      // Monaco Editor CSP 配置
      {
        source: '/admin/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; connect-src 'self' https://cdn.jsdelivr.net;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
