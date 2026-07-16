import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyFirebaseToken } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/server';
import { extractBearerToken } from '@/lib/utils';
import type { Kullanici } from '@/types';

export const runtime = 'nodejs';

/**
 * GET /api/auth/me
 * ─────────────────
 * Firebase ID Token ile kullanıcının Supabase profil bilgisini döner.
 * Kullanıcı ilk kez giriş yapıyorsa profil kaydı otomatik oluşturulur.
 */
export async function GET(request: NextRequest) {
  const token = extractBearerToken(request.headers.get('Authorization'));

  if (!token) {
    return NextResponse.json({ error: 'Yetkisiz: Token bulunamadı' }, { status: 401 });
  }

  try {
    // 1. Firebase token'ı doğrula
    const decodedToken = await verifyFirebaseToken(token);
    const { uid, email } = decodedToken;

    if (!email) {
      return NextResponse.json({ error: 'E-posta adresi bulunamadı' }, { status: 400 });
    }

    // 2. Supabase'den kullanıcı profilini çek
    const { data: existingUser, error } = await supabaseAdmin
      .from('kullanicilar')
      .select('*')
      .eq('id', uid)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = satır bulunamadı — bu beklenen bir durum
      throw error;
    }

    // 3. Kullanıcı yoksa otomatik oluştur (ilk giriş)
    if (!existingUser) {
      const emailPrefix = email.split('@')[0];
      const username = `${emailPrefix}_${uid.slice(0, 6)}`;
      const displayName = decodedToken.name ?? emailPrefix;
      const baseEmail = email.replace(/\+[^@]+/, '').toLowerCase();

      const { data: newUser, error: insertError } = await supabaseAdmin
        .from('kullanicilar')
        .insert({
          id: uid,
          email,
          username,
          display_name: displayName,
          avatar_url: decodedToken.picture ?? null,
          base_email: baseEmail,
          role: 'kullanici',
        })
        .select('*')
        .single();

      if (insertError) throw insertError;

      return NextResponse.json({ ...newUser, topics: [] });
    }

    // 4. Kullanıcı varsa, seçtiği konuları (yazar_konulari) getir
    const { data: userTopics } = await supabaseAdmin
      .from('yazar_konulari')
      .select('konu_id')
      .eq('yazar_id', uid);

    const topicIds = userTopics?.map((ut) => ut.konu_id) ?? [];

    return NextResponse.json({
      ...existingUser,
      topics: topicIds,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Kimlik doğrulama hatası';
    console.error('[Auth/me API] Hata:', message);

    if (message.includes('token') || message.includes('auth')) {
      return NextResponse.json({ error: 'Geçersiz veya süresi dolmuş token' }, { status: 401 });
    }

    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
