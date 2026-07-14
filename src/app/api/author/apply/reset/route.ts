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

    // Reddedilen başvuruyu tamamen sil veya durumunu sıfırla. 
    // En temiz yöntem silmek, böylece kullanıcı sıfırdan form doldurabilir.
    const { error } = await supabaseAdmin
      .from('yazar_basvurulari')
      .delete()
      .eq('user_id', userId)
      .eq('status', 'rejected');

    if (error) {
      return NextResponse.json({ error: 'Başvuru sıfırlanamadı.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Başvuru reset hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
