import { NextResponse } from 'next/server';
import { verifyFirebaseToken } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await verifyFirebaseToken(token);
    const userId = decodedToken.uid;

    const body = await request.json();
    const { content, imageUrls, mentions, contributors, aspectRatio } = body as {
      content: string;
      imageUrls?: string[];
      mentions?: string[];
      contributors?: string[];
      aspectRatio?: string;
    };

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Gönderi içeriği boş olamaz.' }, { status: 400 });
    }

    // Açıklamadan etiketleri (#etiket) otomatik ayıkla
    const hashtagRegex = /#([a-zA-Z0-9çıüğöşÇİÜĞÖŞ_]+)/g;
    const extractedTags: string[] = [];
    let match;
    while ((match = hashtagRegex.exec(content)) !== null) {
      const tag = match[1].toLowerCase().trim();
      if (tag && !extractedTags.includes(tag)) {
        extractedTags.push(tag);
      }
    }

    // Gönderiyi projeler tablosuna ekle, fakulte alanını 'gonderi' olarak ayarla
    const { data: post, error } = await supabaseAdmin
      .from('projeler')
      .insert({
        title: content.slice(0, 50).trim() || 'Gönderi',
        description: content,
        image_urls: imageUrls || [],
        author_id: userId,
        fakulte: 'gonderi',
        mentions: mentions || [],
        contributors: contributors || [],
        tags: extractedTags,
        aspect_ratio: aspectRatio || '1:1'
      })
      .select()
      .single();

    if (error) {
      console.error('[Posts API POST] Hata:', error);
      return NextResponse.json({ error: 'Gönderi eklenemedi.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, post });
  } catch (error) {
    console.error('[Posts API POST] Sunucu hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
