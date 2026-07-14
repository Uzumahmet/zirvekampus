"use strict";

// next.config.js
var nextConfig = {
  // Deneysel Özellikler
  experimental: {
    // Server Actions (Next.js 14'te stable)
    serverActions: {
      bodySizeLimit: "4mb"
    },
    // Firebase Admin SDK client bundle'a girmesin
    serverComponentsExternalPackages: ["firebase-admin"]
  },
  // Resim optimizasyonu için izin verilen domainler
  images: {
    remotePatterns: [
      {
        // Google Profile fotoğrafları (Firebase Auth)
        protocol: "https",
        hostname: "lh3.googleusercontent.com"
      },
      {
        // Supabase Storage (kapak görselleri)
        protocol: "https",
        hostname: "*.supabase.co"
      }
    ]
  },
  // Türkçe karakter içeren sayfa slug'ları için URL encoding desteği
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff"
          },
          {
            key: "X-Frame-Options",
            value: "DENY"
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block"
          }
        ]
      }
    ];
  }
};
module.exports = nextConfig;
