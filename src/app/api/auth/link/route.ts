import { NextResponse } from 'next/server';
import { verifyFirebaseToken } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/server';

const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await verifyFirebaseToken(token);
    const currentUid = decodedToken.uid;

    const body = await request.json();
    const { action, targetUsername, targetPassword, targetUid } = body as {
      action: 'link' | 'unlink';
      targetUsername?: string;
      targetPassword?: string;
      targetUid?: string;
    };

    if (action === 'link') {
      if (!targetUsername || !targetPassword) {
        return NextResponse.json({ error: 'Kullanıcı adı ve şifre gereklidir.' }, { status: 400 });
      }

      // 1. Hedef kullanıcıyı veritabanında ara ve email'ini bul
      const { data: targetUser, error: findError } = await supabaseAdmin
        .from('kullanicilar')
        .select('id, email, username')
        .eq('username', targetUsername.trim().toLowerCase())
        .maybeSingle();

      if (findError) throw findError;
      if (!targetUser) {
        return NextResponse.json({ error: 'Bağlanacak kullanıcı bulunamadı.' }, { status: 404 });
      }

      if (targetUser.id === currentUid) {
        return NextResponse.json({ error: 'Kendi hesabınızı kendinize bağlayamazsınız.' }, { status: 400 });
      }

      // 2. Şifreyi doğrulamak için Firebase Auth REST API'ına istek at
      const verifyRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: targetUser.email,
            password: targetPassword,
            returnSecureToken: true,
          }),
        }
      );

      if (!verifyRes.ok) {
        return NextResponse.json({ error: 'Girdiğiniz kullanıcı adı veya şifre hatalı.' }, { status: 400 });
      }

      // Şifre doğrulandı! Şimdi hesapları bağlayalım.
      // Her iki yönlü ilişkiyi de garantilemek için (A -> B) ve (B -> A) şeklinde sadece tek bir kayıt tutmak yeterlidir,
      // ancak sorgularken kolaylık olsun diye ID'leri sıralayıp küçük olanı ana_user_id, büyük olanı bagli_user_id olarak kaydedelim.
      const [u1, u2] = [currentUid, targetUser.id].sort();

      const { error: insertError } = await supabaseAdmin
        .from('hesap_baglantilari')
        .insert({
          ana_user_id: u1,
          bagli_user_id: u2,
        });

      if (insertError && insertError.code !== '23505') { // 23505 unique_violation hatası (zaten bağlıysa hata vermesin)
        throw insertError;
      }

      return NextResponse.json({ success: true, message: 'Hesap başarıyla bağlandı.' });
    } 
    
    if (action === 'unlink') {
      if (!targetUid) {
        return NextResponse.json({ error: 'Bağlantısı kesilecek hesabın UID bilgisi gereklidir.' }, { status: 400 });
      }

      const [u1, u2] = [currentUid, targetUid].sort();

      const { error: deleteError } = await supabaseAdmin
        .from('hesap_baglantilari')
        .delete()
        .eq('ana_user_id', u1)
        .eq('bagli_user_id', u2);

      if (deleteError) throw deleteError;

      return NextResponse.json({ success: true, message: 'Hesap bağlantısı başarıyla kesildi.' });
    }

    return NextResponse.json({ error: 'Geçersiz eylem' }, { status: 400 });
  } catch (error) {
    console.error('Hesap bağlama hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
