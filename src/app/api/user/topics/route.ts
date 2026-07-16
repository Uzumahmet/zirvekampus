import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
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
    const { name } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Etiket adı boş olamaz.' }, { status: 400 });
    }

    const cleanName = name.trim();
    const slug = cleanName
      .toLowerCase()
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    // 1. Konunun var olup olmadığını kontrol et
    let { data: existingTopic } = await supabaseAdmin
      .from('konular')
      .select('*')
      .eq('name', cleanName)
      .maybeSingle();

    if (!existingTopic) {
      // 2. Yeni konu oluştur
      const { data: newTopic, error: createError } = await supabaseAdmin
        .from('konular')
        .insert({
          name: cleanName,
          slug: slug || `topic-${Date.now()}`
        })
        .select()
        .single();

      if (createError || !newTopic) {
        console.error('[Topics API] Yeni konu oluşturulamadı:', createError);
        return NextResponse.json({ error: 'Etiket oluşturulamadı.' }, { status: 500 });
      }
      existingTopic = newTopic;
    }

    // 3. Kullanıcıya etiket olarak ata
    const { error: mapError } = await supabaseAdmin
      .from('yazar_konulari')
      .insert({
        yazar_id: userId,
        konu_id: existingTopic.id
      });

    return NextResponse.json({ success: true, topic: existingTopic });
  } catch (error) {
    console.error('[User Topics POST] Sunucu hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await verifyFirebaseToken(token);
    const userId = decodedToken.uid;

    const { searchParams } = new URL(request.url);
    const topicId = searchParams.get('topicId');

    if (!topicId) {
      return NextResponse.json({ error: 'Geçersiz parametre' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('yazar_konulari')
      .delete()
      .eq('yazar_id', userId)
      .eq('konu_id', parseInt(topicId));

    if (error) {
      return NextResponse.json({ error: 'Etiket kaldırılamadı' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
