import { NextResponse } from 'next/server';
import { verifyFirebaseToken } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await verifyFirebaseToken(token);
    const userId = decodedToken.uid;

    const { data: basvuru, error } = await supabaseAdmin
      .from('yazar_basvurulari')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: 'Başvuru sorgulanamadı.' }, { status: 500 });
    }

    return NextResponse.json({ basvuru });
  } catch (error) {
    console.error('Başvuru GET hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await verifyFirebaseToken(token);
    const userId = decodedToken.uid;

    const { reason, sampleWriting } = await request.json();

    // Kullanıcının halihazırda onaylanmış veya bekleyen başvurusu var mı kontrol et
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('yazar_basvurulari')
      .select('status')
      .eq('user_id', userId)
      .maybeSingle();

    if (checkError) {
      return NextResponse.json({ error: 'Başvuru kontrolü başarısız.' }, { status: 500 });
    }

    if (existing && (existing.status === 'pending' || existing.status === 'approved')) {
      return NextResponse.json({ error: 'Zaten aktif veya bekleyen bir başvurunuz bulunuyor.' }, { status: 400 });
    }

    // Başvuruyu ekle (varsa eskisinin üstüne yaz / güncelle veya yeni ekle)
    const { data: newBasvuru, error: insertError } = await supabaseAdmin
      .from('yazar_basvurulari')
      .upsert({
        user_id: userId,
        reason,
        sample_writing: sampleWriting,
        status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error(insertError);
      return NextResponse.json({ error: 'Başvuru kaydedilemedi.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, basvuru: newBasvuru });
  } catch (error) {
    console.error('Başvuru POST hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
