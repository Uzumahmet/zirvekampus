import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';
// 60 dakika ISR cache'i (Günlük özet değişmez)
export const revalidate = 3600;

/**
 * GET /api/ai-summary
 * ────────────────────
 * Son 24 saatteki en popüler makaleleri çekip
 * Gemini 2.5 Flash ile özetler ve tek paragraf döner.
 */
export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Gemini API key tanımlı değil' }, { status: 500 });
  }

  try {
    // 1. Son 24 saatteki en popüler 5 makaleyi çek
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: articles, error } = await supabaseAdmin
      .from('makaleler')
      .select('title, excerpt')
      .eq('status', 'published')
      .gte('created_at', yesterday)
      .order('views_count', { ascending: false })
      .limit(5);

    if (error || !articles || articles.length === 0) {
      // 24 saatte yeni makale yoksa son 7 günü dene
      const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: weekArticles } = await supabaseAdmin
        .from('makaleler')
        .select('title, excerpt')
        .eq('status', 'published')
        .gte('created_at', lastWeek)
        .order('views_count', { ascending: false })
        .limit(5);

      if (!weekArticles || weekArticles.length === 0) {
        return NextResponse.json({
          summary: 'Henüz yeterli içerik yok. Yakında burada günün özeti görünecek!',
        });
      }
    }

    const articleList = (articles && articles.length > 0 ? articles : [])
      .map((a, i) => `${i + 1}. ${a.title}${a.excerpt ? ` — ${a.excerpt}` : ''}`)
      .join('\n');

    // 2. Gemini ile özetle
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
Aşağıda Erciyes Üniversitesi öğrenci platformunda bugün en çok okunan makalelerin başlıkları ve özetleri var.
Bu içerikleri Türkçe olarak, 2-3 cümlelik tek bir paragrafta özetle.
Metin sade, akıcı ve bilgilendirici olsun. Madde madde değil, düz paragraf yaz.
"Günün özeti:" gibi bir giriş cümlesi kullanma, direkt içeriğe gir.

Makaleler:
${articleList}
`;

    const result = await model.generateContent(prompt);
    const summary = result.response.text().trim();

    return NextResponse.json({ summary });
  } catch (err) {
    console.error('[AI Summary API] Hata:', err);
    return NextResponse.json(
      { summary: 'Günün özeti şu an yüklenemiyor. Daha sonra tekrar deneyin.' },
      { status: 200 } // 200 döndür ki frontend düzgün render etsin
    );
  }
}
