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
    const { username, displayName, email, baseEmail } = body as {
      username: string;
      displayName: string;
      email: string;
      baseEmail: string;
    };

    if (!username || !displayName || !email || !baseEmail) {
      return NextResponse.json({ error: 'Tüm alanların doldurulması zorunludur.' }, { status: 400 });
    }

    // Kullanıcı adının benzersizliğini ve formatını bir kez daha doğrula
    const cleanUsername = username.trim().toLowerCase();
    if (!/^[a-z0-9_.-]+$/.test(cleanUsername)) {
      return NextResponse.json({ error: 'Geçersiz kullanıcı adı formatı.' }, { status: 400 });
    }

    // Supabase'e kaydet
    const { data: newUser, error: insertError } = await supabaseAdmin
      .from('kullanicilar')
      .insert({
        id: userId,
        email: email.trim().toLowerCase(),
        username: cleanUsername,
        display_name: displayName.trim(),
        base_email: baseEmail.trim().toLowerCase(),
        role: 'kullanici',
      })
      .select('*')
      .single();

    if (insertError) {
      console.error('Supabase insert hatası:', insertError);
      return NextResponse.json({ error: 'Profil veritabanına kaydedilemedi.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, user: newUser });
  } catch (error) {
    console.error('Kayıt API hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
