import type { MetadataRoute } from 'next';

/**
 * Robots.txt Yapılandırması
 * ─────────────────────────
 * URL: /robots.txt
 * 
 * Arama motoru botlarının, yapay zeka (AI) tarayıcılarının (GPTBot, ClaudeBot, vb.)
 * ve diğer tüm web crawler'larının siteyi tam kapsamlı gezip dizine ekleyebilmesi için 
 * tüm engeller kaldırılmıştır.
 */
export default function robots(): MetadataRoute.Robots {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://erciyeskampus.com';

  return {
    rules: [
      {
        // Bütün botlara ve AI tarayıcılarına sınırsız genel erişim izni
        userAgent: '*',
        allow: '/',
        disallow: [
          '/yazar-paneli',         // Yazar kontrol paneli (giriş gerektirir)
          '/editor-paneli',        // Editör kontrol paneli (giriş gerektirir)
          '/api/',                 // API uç noktaları
          '/_next/',               // Next.js dahili klasörü
          '/giris-yap',            
          '/kayit-ol',             
        ],
      },
    ],
    sitemap: `${appUrl}/sitemap.xml`,
    host: appUrl,
  };
}
