/** @type {import('next').NextConfig} */
const nextConfig = {
  // Deneysel Özellikler
  experimental: {
    // Server Actions (Next.js 14'te stable)
    serverActions: {
      bodySizeLimit: '4mb',
    },
    // Firebase Admin SDK client bundle'a girmesin
    serverComponentsExternalPackages: ['firebase-admin'],
  },

  // SWC ile daha hızlı derleme (Babel yerine)
  swcMinify: true,

  // Production'da source map üretme → build daha hızlı
  productionBrowserSourceMaps: false,

  // TypeScript hatalarında build durmasın (CI için isteğe bağlı)
  // typescript: { ignoreBuildErrors: false },

  // ESLint'i build sırasında çalıştırma (ayri komutla çalıştır)
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Resim optimizasyonu için izin verilen domainler
  images: {
    remotePatterns: [
      {
        // Google Profile fotoğrafları (Firebase Auth)
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        // Supabase Storage (kapak görselleri)
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        // Firebase Storage
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
    ],
  },

  // Türkçe karakter içeren sayfa slug'ları için URL encoding desteği
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
