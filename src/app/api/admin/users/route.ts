import { NextResponse } from 'next/server';
import { verifyFirebaseToken } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/server';

// GET: Tüm kullanıcıları listeler (Admin/Editör korumalı)
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

    // Tüm kullanıcıları getir
    const { data: users, error: fetchErr } = await supabaseAdmin
      .from('kullanicilar')
      .select('*')
      .order('created_at', { ascending: false });

    if (fetchErr) {
      console.error('[Admin Users GET] Hata:', fetchErr);
      return NextResponse.json({ error: 'Kullanıcılar çekilemedi.' }, { status: 500 });
    }

    return NextResponse.json({ users });
  } catch (error) {
    console.error('[Admin Users GET] Sunucu Hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// POST: Kullanıcı rolünü güncelle (Admin korumalı)
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

    // Sadece admin başkasının rolünü değiştirebilir (Editör değiştiremez, sadece başvuruları inceleyebilir)
    if (userError || !user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Bu işlem için ADMIN yetkisi gerekmektedir.' }, { status: 403 });
    }

    const body = await request.json();
    const { targetUserId, newRole, showAsWriter } = body;

    if (!targetUserId) {
      return NextResponse.json({ error: 'targetUserId gereklidir.' }, { status: 400 });
    }

    const updatePayload: Record<string, any> = {};

    if (newRole) {
      const allowedRoles = ['anonim', 'kullanici', 'yazar', 'editor', 'admin'];
      if (!allowedRoles.includes(newRole)) {
        return NextResponse.json({ error: 'Geçersiz rol.' }, { status: 400 });
      }
      if (targetUserId === userId) {
        return NextResponse.json({ error: 'Kendi rolünüzü değiştiremezsiniz.' }, { status: 400 });
      }
      updatePayload['role'] = newRole;
    }

    if (typeof showAsWriter === 'boolean') {
      updatePayload['show_as_writer'] = showAsWriter;
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'Güncellenecek alan yok.' }, { status: 400 });
    }

    try {
      const { error: updateErr } = await supabaseAdmin
        .from('kullanicilar')
        .update(updatePayload)
        .eq('id', targetUserId);

      if (updateErr) throw updateErr;
    } catch (err: any) {
      if (err.message?.includes('show_as_writer') || err.code === '42703') {
        console.warn('[Admin Users POST] show_as_writer kolonu bulunamadı, bu parametre olmadan tekrar deneniyor...');
        delete updatePayload['show_as_writer'];
        if (Object.keys(updatePayload).length > 0) {
          const { error: retryErr } = await supabaseAdmin
            .from('kullanicilar')
            .update(updatePayload)
            .eq('id', targetUserId);
          if (retryErr) {
            console.error('[Admin Users POST] Güncelleme Hatası:', retryErr);
            return NextResponse.json({ error: 'Kullanıcı güncellenemedi.' }, { status: 500 });
          }
        }
      } else {
        console.error('[Admin Users POST] Güncelleme Hatası:', err);
        return NextResponse.json({ error: 'Kullanıcı güncellenemedi.' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Admin Users POST] Sunucu Hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
