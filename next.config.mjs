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
      {
        protocol: 'https',
        hostname: 'mahirooyama.cn',
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
              'camera=(), microphone=(), geolocation=(self), interest-cohort=()',
          },
        ],
      },
      // 生产环境：HTML 页面 - 短期缓存，支持重新验证
      ...(process.env.NODE_ENV === 'production'
        ? [
            {
              source: '/:path((?!\\.\\w+$).)*',
              headers: [
                {
                  key: 'Cache-Control',
                  value: 'public, max-age=0, must-revalidate',
                },
              ],
            },
          ]
        : []),
      // 生产环境：CSS/JS 文件 - 中期缓存，支持重新验证
      ...(process.env.NODE_ENV === 'production'
        ? [
            {
              source: '/:path*\\.(css|js)$',
              headers: [
                {
                  key: 'Cache-Control',
                  value: 'public, max-age=31536000, immutable',
                },
              ],
            },
          ]
        : []),
      // 生产环境：字体文件 - 长期缓存，不可变
      ...(process.env.NODE_ENV === 'production'
        ? [
            {
              source: '/:path*\\.(woff2|woff|ttf|otf|eot)',
              headers: [
                {
                  key: 'Cache-Control',
                  value: 'public, max-age=31536000, immutable',
                },
              ],
            },
          ]
        : []),
      // 生产环境：图片文件 - 长期缓存，不可变
      ...(process.env.NODE_ENV === 'production'
        ? [
            {
              source: '/:path*\\.(avif|webp|png|jpg|jpeg|gif|svg|ico)',
              headers: [
                {
                  key: 'Cache-Control',
                  value: 'public, max-age=31536000, immutable',
                },
              ],
            },
          ]
        : []),
      // 生产环境：媒体文件 - 长期缓存，不可变
      ...(process.env.NODE_ENV === 'production'
        ? [
            {
              source: '/:path*\\.(mp4|webm|mp3|wav|ogg)',
              headers: [
                {
                  key: 'Cache-Control',
                  value: 'public, max-age=31536000, immutable',
                },
              ],
            },
          ]
        : []),
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
      // 开发环境：静态资源禁用缓存
      ...(process.env.NODE_ENV !== 'production'
        ? [
            {
              source:
                '/:path*\\.(css|js|png|jpg|jpeg|gif|svg|ico|woff2|woff|ttf|otf)',
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
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; connect-src 'self' https://nominatim.openstreetmap.org;",
          },
        ],
      },
    ];
  },
  experimental: {
    proxyClientMaxBodySize: '100mb', // 增加请求头大小限制
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
};

export default nextConfig;
