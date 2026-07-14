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

    const { name, description, isPublic } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Koleksiyon adı boş olamaz.' }, { status: 400 });
    }

    const { data: newCol, error } = await supabaseAdmin
      .from('koleksiyonlar')
      .insert({
        user_id: userId,
        name: name.trim(),
        description: description ? description.trim() : null,
        is_public: isPublic ?? true,
      })
      .select()
      .single();

    if (error || !newCol) {
      console.error(error);
      return NextResponse.json({ error: 'Koleksiyon oluşturulamadı.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, collection: newCol });
  } catch (error) {
    console.error('Koleksiyon oluşturma hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
