import { NextResponse } from 'next/server';
import { verifyFirebaseToken } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/server';

// GET: Tüm başvuruları listeler (Admin/Editör korumalı)
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await verifyFirebaseToken(token);
    const userId = decodedToken.uid;

    // İstekte bulunan kullanıcının rolünü doğrula
    const { data: user, error: userError } = await supabaseAdmin
      .from('kullanicilar')
      .select('role')
      .eq('id', userId)
      .single();

    if (userError || !user || !['admin', 'editor'].includes(user.role)) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz bulunmamaktadır.' }, { status: 403 });
    }

    // Başvuruları getiren sorgu (Kullanıcı profilleriyle birleştirerek)
    const { data: applications, error: appsError } = await supabaseAdmin
      .from('yazar_basvurulari')
      .select(`
        *,
        user:kullanicilar(username, display_name, email, avatar_url)
      `)
      .order('created_at', { ascending: false });

    if (appsError) {
      console.error('[Admin Applications GET] Hata:', appsError);
      return NextResponse.json({ error: 'Başvurular çekilemedi.' }, { status: 500 });
    }

    return NextResponse.json({ applications });
  } catch (error) {
    console.error('[Admin Applications GET] Sunucu Hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// POST: Başvuruyu onayla veya reddet
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await verifyFirebaseToken(token);
    const userId = decodedToken.uid;

    // İstekte bulunan kullanıcının rolünü doğrula
    const { data: user, error: userError } = await supabaseAdmin
      .from('kullanicilar')
      .select('role')
      .eq('id', userId)
      .single();

    if (userError || !user || !['admin', 'editor'].includes(user.role)) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz bulunmamaktadır.' }, { status: 403 });
    }

    const body = await request.json();
    const { applicationId, status, reviewNotes } = body; // status: 'approved' | 'rejected'

    if (!applicationId || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Geçersiz parametreler.' }, { status: 400 });
    }

    // Başvurunun mevcut durumunu ve başvuran kullanıcının ID'sini çek
    const { data: app, error: appFetchErr } = await supabaseAdmin
      .from('yazar_basvurulari')
      .select('user_id, status')
      .eq('id', applicationId)
      .single();

    if (appFetchErr || !app) {
      return NextResponse.json({ error: 'Başvuru bulunamadı.' }, { status: 404 });
    }

    // Başvuruyu güncelle
    const { error: appUpdateErr } = await supabaseAdmin
      .from('yazar_basvurulari')
      .update({
        status,
        reviewer_id: userId,
        review_notes: reviewNotes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', applicationId);

    if (appUpdateErr) {
      console.error('[Admin Applications POST] Güncelleme Hatası:', appUpdateErr);
      return NextResponse.json({ error: 'Başvuru güncellenemedi.' }, { status: 500 });
    }

    // Eğer onaylandı ise kullanıcının rolünü 'yazar' yap
    if (status === 'approved') {
      const { error: roleUpdateErr } = await supabaseAdmin
        .from('kullanicilar')
        .update({ role: 'yazar' })
        .eq('id', app.user_id);

      if (roleUpdateErr) {
        console.error('[Admin Applications POST] Kullanıcı rol güncelleme hatası:', roleUpdateErr);
        return NextResponse.json({ error: 'Başvuru onaylandı fakat kullanıcının rolü güncellenemedi.' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Admin Applications POST] Sunucu Hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
