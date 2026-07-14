import { NextResponse } from 'next/server';
import { verifyFirebaseToken, adminAuth } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/server';

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
    const { targetUid } = body as { targetUid: string };

    if (!targetUid) {
      return NextResponse.json({ error: 'Hedef hesap bilgisi gereklidir.' }, { status: 400 });
    }

    if (currentUid === targetUid) {
      return NextResponse.json({ error: 'Zaten bu hesaptasınız.' }, { status: 400 });
    }

    // 1. Aynı base_email'e mi sahipler?
    const { data: users, error: userError } = await supabaseAdmin
      .from('kullanicilar')
      .select('id, base_email, email')
      .in('id', [currentUid, targetUid]);

    if (userError) throw userError;

    let isAuthorized = false;

    if (users && users.length === 2) {
      const u1 = users[0];
      const u2 = users[1];

      // Normalize edip base email'lerini karşılaştır
      const getBaseEmail = (emailStr: string) => emailStr.replace(/\+[^@]+/, '').toLowerCase();
      
      const base1 = u1.base_email?.toLowerCase() || getBaseEmail(u1.email);
      const base2 = u2.base_email?.toLowerCase() || getBaseEmail(u2.email);

      if (base1 === base2) {
        isAuthorized = true;
      }
    }

    // 2. Eğer aynı e-postada değillerse, hesap_baglantilari tablosunda bağlılar mı?
    if (!isAuthorized) {
      const [su1, su2] = [currentUid, targetUid].sort();
      const { data: link, error: linkError } = await supabaseAdmin
        .from('hesap_baglantilari')
        .select('id')
        .eq('ana_user_id', su1)
        .eq('bagli_user_id', su2)
        .maybeSingle();

      if (linkError) throw linkError;
      if (link) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Bu hesaba geçiş yapmak için yetkiniz bulunmuyor. Önce hesapları bağlamalısınız.' },
        { status: 403 }
      );
    }

    // Yetki onaylandı! Firebase Custom Token oluştur ve dön
    const customToken = await adminAuth.createCustomToken(targetUid);

    return NextResponse.json({ customToken });
  } catch (error) {
    console.error('Hesap değiştirme hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
export async function GET(request: Request) {
  // Hızlıca bağlı hesapların listesini çekmek için de bu endpoint'i kullanabiliriz
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await verifyFirebaseToken(token);
    const currentUid = decodedToken.uid;

    // 1. Kendi profilimizi çek
    const { data: me, error: meError } = await supabaseAdmin
      .from('kullanicilar')
      .select('email, base_email')
      .eq('id', currentUid)
      .single();

    if (meError) throw meError;

    const getBaseEmail = (emailStr: string) => emailStr.replace(/\+[^@]+/, '').toLowerCase();
    const myBaseEmail = me.base_email?.toLowerCase() || getBaseEmail(me.email);

    // 2. Aynı base_email'e sahip diğer hesapları bul
    const { data: sameEmailUsers, error: sameEmailError } = await supabaseAdmin
      .from('kullanicilar')
      .select('id, username, display_name, avatar_url, role')
      .or(`base_email.ilike.${myBaseEmail},email.ilike.${myBaseEmail},email.ilike.${myBaseEmail.replace('@', '+%@')}`);

    if (sameEmailError) throw sameEmailError;

    // 3. hesap_baglantilari tablosundaki diğer bağlı hesapları bul
    const { data: links1, error: links1Error } = await supabaseAdmin
      .from('hesap_baglantilari')
      .select('bagli_user_id')
      .eq('ana_user_id', currentUid);

    const { data: links2, error: links2Error } = await supabaseAdmin
      .from('hesap_baglantilari')
      .select('ana_user_id')
      .eq('bagli_user_id', currentUid);

    if (links1Error || links2Error) throw (links1Error || links2Error);

    const linkedUids = [
      ...(links1 ?? []).map(l => l.bagli_user_id),
      ...(links2 ?? []).map(l => l.ana_user_id),
    ];

    let allLinkedUsers: any[] = [];
    if (linkedUids.length > 0) {
      const { data: queryUsers, error: queryError } = await supabaseAdmin
        .from('kullanicilar')
        .select('id, username, display_name, avatar_url, role')
        .in('id', linkedUids);
      if (queryError) throw queryError;
      allLinkedUsers = queryUsers ?? [];
    }

    // Listeleri birleştir ve tekilleştir
    const uniqueMap = new Map<string, any>();
    [...(sameEmailUsers ?? []), ...allLinkedUsers].forEach(u => {
      if (u.id !== currentUid) {
        uniqueMap.set(u.id, u);
      }
    });

    return NextResponse.json({
      activeUid: currentUid,
      accounts: Array.from(uniqueMap.values()),
    });
  } catch (error) {
    console.error('Bağlı hesapları getirme hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
