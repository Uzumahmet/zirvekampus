import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/search/users?q=<searchQuery>
 * ──────────────────────────────────────
 * Etiketleme için yazılan harflere göre kullanıcıları listeler.
 * Defansif olarak `allow_mentions` filtresini uygular.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const qRaw = searchParams.get('q')?.trim().toLowerCase() || '';
    const q = qRaw.startsWith('@') ? qRaw.slice(1) : qRaw;

    // 1. Önce allow_mentions kolonu varmış gibi filtrelemeyi dene
    try {
      let query = supabaseAdmin
        .from('kullanicilar')
        .select('id, username, display_name, avatar_url');

      if (q && q.length >= 1) {
        query = query.or(`username.ilike.%${q}%,display_name.ilike.%${q}%`);
      }

      const { data, error } = await query
        .eq('allow_mentions', true)
        .limit(5);

      if (error) throw error;
      return NextResponse.json(data ?? []);
    } catch (dbErr: any) {
      // Kolon yoksa (42703 hatası) veya başka bir hata varsa filtre olmadan dene
      console.warn('[Search Users API] allow_mentions filtresi uygulanamadı, yedek sorguya geçiliyor:', dbErr.message);
      
      let query = supabaseAdmin
        .from('kullanicilar')
        .select('id, username, display_name, avatar_url');

      if (q && q.length >= 1) {
        query = query.or(`username.ilike.%${q}%,display_name.ilike.%${q}%`);
      }

      const { data, error: fallbackError } = await query.limit(5);

      if (fallbackError) {
        throw fallbackError;
      }
      return NextResponse.json(data ?? []);
    }
  } catch (err) {
    console.error('[Search Users API] Sunucu Hatası:', err);
    return NextResponse.json({ error: 'Arama yapılamadı' }, { status: 500 });
  }
}
