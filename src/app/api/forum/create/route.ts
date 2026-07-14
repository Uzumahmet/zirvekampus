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

    const { title, content } = await request.json();

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Başlık boş olamaz.' }, { status: 400 });
    }
    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'İçerik boş olamaz.' }, { status: 400 });
    }

    // Başlık için slug oluştur
    const baseSlug = title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');
    const slug = `${baseSlug}-${Date.now().toString().slice(-4)}`;

    // 1. Forum Başlığını Oluştur
    const { data: topic, error: topicError } = await supabaseAdmin
      .from('forum_basliklari')
      .insert({
        title: title.trim(),
        slug,
        created_by: userId,
      })
      .select()
      .single();

    if (topicError || !topic) {
      console.error(topicError);
      return NextResponse.json({ error: 'Forum başlığı oluşturulamadı.' }, { status: 500 });
    }

    // 2. İlk Entry'yi ekle
    const { error: entryError } = await supabaseAdmin
      .from('forum_entryleri')
      .insert({
        topic_id: topic.id,
        content: content.trim(),
        author_id: userId,
        is_anonymous: false,
      });

    if (entryError) {
      // Rollback için oluşturulan başlığı silebiliriz
      await supabaseAdmin.from('forum_basliklari').delete().eq('id', topic.id);
      console.error(entryError);
      return NextResponse.json({ error: 'İlk forum mesajı eklenemedi.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, slug: topic.slug });
  } catch (error) {
    console.error('Forum başlığı oluşturma hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
