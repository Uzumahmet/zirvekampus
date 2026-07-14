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

    const { collectionId, itemId, itemType, action } = await request.json();

    if (!collectionId || !itemId || !itemType || !action) {
      return NextResponse.json({ error: 'Eksik parametreler.' }, { status: 400 });
    }

    // Koleksiyonun kullanıcıya ait olduğunu doğrula
    const { data: collection, error: colError } = await supabaseAdmin
      .from('koleksiyonlar')
      .select('user_id')
      .eq('id', collectionId)
      .single();

    if (colError || !collection) {
      return NextResponse.json({ error: 'Koleksiyon bulunamadı.' }, { status: 404 });
    }

    if (collection.user_id !== userId) {
      return NextResponse.json({ error: 'Bu koleksiyonu yönetme yetkiniz yok.' }, { status: 403 });
    }

    if (action === 'add') {
      const { error: insertError } = await supabaseAdmin
        .from('koleksiyon_ogeleri')
        .insert({
          koleksiyon_id: collectionId,
          oge_id: itemId,
          oge_tipi: itemType,
        });

      if (insertError) {
        console.error(insertError);
        return NextResponse.json({ error: 'Öğe koleksiyona eklenemedi.' }, { status: 500 });
      }

      return NextResponse.json({ success: true, added: true });
    } else if (action === 'remove') {
      const { error: deleteError } = await supabaseAdmin
        .from('koleksiyon_ogeleri')
        .delete()
        .eq('koleksiyon_id', collectionId)
        .eq('oge_id', itemId);

      if (deleteError) {
        console.error(deleteError);
        return NextResponse.json({ error: 'Öğe koleksiyondan çıkarılamadı.' }, { status: 500 });
      }

      return NextResponse.json({ success: true, removed: true });
    }

    return NextResponse.json({ error: 'Geçersiz işlem.' }, { status: 400 });
  } catch (error) {
    console.error('Koleksiyon öğe hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
