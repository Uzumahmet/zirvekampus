import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import type { SearchResponse } from '@/types';

export const runtime = 'nodejs';

/**
 * GET /api/search?q=<query>
 * ─────────────────────────
 * Supabase Full-Text Search üzerinden makaleler, forum başlıkları
 * ve yazarlar arasında eş zamanlı arama yapar.
 * Sonuçlar tip bazlı gruplara ayrılmış olarak döner.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json<SearchResponse>({ results: [], query: query ?? '' });
  }

  try {
    const { data, error } = await supabaseAdmin.rpc('omni_search', {
      search_query: query,
    });

    if (error) {
      console.error('[Search API] Supabase hata:', error);
      return NextResponse.json({ error: 'Arama sırasında hata oluştu' }, { status: 500 });
    }

    return NextResponse.json<SearchResponse>({
      results: data ?? [],
      query,
    });
  } catch (err) {
    console.error('[Search API] Beklenmeyen hata:', err);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
