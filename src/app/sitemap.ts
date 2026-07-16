import type { MetadataRoute } from 'next';
import { supabaseAdmin } from '@/lib/supabase/server';

/**
 * Dinamik Sitemap (sitemap.xml)
 * ─────────────────────────────
 * Next.js App Router'ın MetadataRoute.Sitemap API'si ile otomatik üretilir.
 * Google ve diğer botlar bu dosyayı okuyarak tüm sayfaları keşfeder.
 * 
 * URL: /sitemap.xml
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://erciyeskampus.com';

  // ─── Statik Rotalar ──────────────────────────────────────────
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: appUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${appUrl}/makale`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${appUrl}/yazarlar`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${appUrl}/forum`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.8,
    },
    {
      url: `${appUrl}/kulupler`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
  ];

  // ─── Dinamik Kulüpler ─────────────────────────────────────────
  const { data: kulupler } = await supabaseAdmin
    .from('clubs')
    .select('slug, updated_at')
    .order('updated_at', { ascending: false })
    .limit(500);

  const kulupRoutes: MetadataRoute.Sitemap = (kulupler ?? []).map((k) => ({
    url: `${appUrl}/kulupler/${k.slug}`,
    lastModified: new Date(k.updated_at ?? new Date()),
    changeFrequency: 'daily',
    priority: 0.80,
  }));

  // ─── Dinamik Makaleler ───────────────────────────────────────
  const { data: makaleler } = await supabaseAdmin
    .from('makaleler')
    .select('slug, updated_at')
    .eq('status', 'published')
    .order('updated_at', { ascending: false });

  const makaleRoutes: MetadataRoute.Sitemap = (makaleler ?? []).map((m) => ({
    url: `${appUrl}/makale/${m.slug}`,
    lastModified: new Date(m.updated_at),
    changeFrequency: 'weekly',
    priority: 0.85,
  }));

  // ─── Dinamik Kullanıcı Profilleri ─────────────────────────
  const { data: kullanicilar } = await supabaseAdmin
    .from('kullanicilar')
    .select('username, updated_at')
    .order('updated_at', { ascending: false })
    .limit(1000); // En aktif 1000 profil

  const yazarRoutes: MetadataRoute.Sitemap = (kullanicilar ?? []).map((y) => ({
    url: `${appUrl}/${y.username}`,
    lastModified: new Date(y.updated_at),
    changeFrequency: 'weekly',
    priority: 0.75,
  }));

  // ─── Dinamik Forum Başlıkları ─────────────────────────────────
  const { data: forumBasliklari } = await supabaseAdmin
    .from('forum_basliklari')
    .select('slug, created_at')
    .order('created_at', { ascending: false })
    .limit(500); // En son 500 başlık

  const forumRoutes: MetadataRoute.Sitemap = (forumBasliklari ?? []).map((f) => ({
    url: `${appUrl}/forum/${f.slug}`,
    lastModified: new Date(f.created_at),
    changeFrequency: 'daily',
    priority: 0.65,
  }));

  // ─── Dinamik Koleksiyonlar (Herkese Açık) ────────────────────
  const { data: koleksiyonlar } = await supabaseAdmin
    .from('koleksiyonlar')
    .select('id, created_at')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(500);

  const koleksiyonRoutes: MetadataRoute.Sitemap = (koleksiyonlar ?? []).map((c) => ({
    url: `${appUrl}/koleksiyon/${c.id}`,
    lastModified: new Date(c.created_at),
    changeFrequency: 'daily',
    priority: 0.7,
  }));

  // ─── Dinamik Projeler ───────────────────────────────────────
  const { data: projeler } = await supabaseAdmin
    .from('projeler')
    .select('id, updated_at')
    .order('updated_at', { ascending: false })
    .limit(500);

  const projeRoutes: MetadataRoute.Sitemap = (projeler ?? []).map((p) => ({
    url: `${appUrl}/projeler/${p.id}`,
    lastModified: new Date(p.updated_at),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [
    ...staticRoutes,
    ...makaleRoutes,
    ...projeRoutes,
    ...yazarRoutes,
    ...forumRoutes,
    ...koleksiyonRoutes,
    ...kulupRoutes
  ];
}

