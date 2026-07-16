import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyFirebaseToken } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/server';
import { extractBearerToken } from '@/lib/utils';

export const runtime = 'nodejs';

/**
 * POST /api/user/update
 * ──────────────────────
 * Giriş yapmış kullanıcının profil bilgilerini (display_name, bio) günceller.
 * Body: { displayName?: string; bio?: string }
 */
export async function POST(request: NextRequest) {
  const token = extractBearerToken(request.headers.get('Authorization'));
  if (!token) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  }

  try {
    const decoded = await verifyFirebaseToken(token);
    const body = await request.json();
    const { displayName, bio, avatarUrl, username, fakulte, fakulteGizli, topics, allowMentions, schoolEmail, phoneNumber } = body as {
      displayName?: string;
      bio?: string;
      avatarUrl?: string;
      username?: string;
      fakulte?: string;
      fakulteGizli?: boolean;
      topics?: number[];
      allowMentions?: boolean;
      schoolEmail?: string;
      phoneNumber?: string;
    };

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof allowMentions === 'boolean') {
      updatePayload['allow_mentions'] = allowMentions;
    }

    if (typeof schoolEmail === 'string') {
      updatePayload['school_email'] = schoolEmail.trim().toLowerCase();
    }

    if (typeof phoneNumber === 'string') {
      updatePayload['phone_number'] = phoneNumber.trim();
    }

    if (typeof fakulte === 'string') {
      const trimmedFakulte = fakulte.trim();
      if (!trimmedFakulte) {
        return NextResponse.json(
          { error: 'Fakülte bilgisi girmek zorunludur.' },
          { status: 400 }
        );
      }
      updatePayload['fakulte'] = trimmedFakulte;
    }

    if (typeof fakulteGizli === 'boolean') {
      updatePayload['fakulte_gizli'] = fakulteGizli;
    }

    if (typeof username === 'string') {
      const cleanUsername = username.trim().toLowerCase();
      
      // Kullanıcı adı geçerli formatta mı?
      if (!/^[a-z0-9_.-]+$/.test(cleanUsername)) {
        return NextResponse.json(
          { error: 'Kullanıcı adı sadece küçük harf, rakam, alt çizgi (_), nokta (.) ve tire (-) içerebilir.' },
          { status: 400 }
        );
      }

      if (cleanUsername.length < 3 || cleanUsername.length > 30) {
        return NextResponse.json(
          { error: 'Kullanıcı adı 3-30 karakter arasında olmalıdır.' },
          { status: 400 }
        );
      }

      // Kullanıcı adının başka birisinde olup olmadığını kontrol et
      const { data: existingUser, error: checkError } = await supabaseAdmin
        .from('kullanicilar')
        .select('id')
        .eq('username', cleanUsername)
        .neq('id', decoded.uid)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingUser) {
        return NextResponse.json(
          { error: 'Bu kullanıcı adı zaten alınmış.' },
          { status: 400 }
        );
      }

      updatePayload['username'] = cleanUsername;
    }

    if (typeof displayName === 'string') {
      const trimmed = displayName.trim();
      if (trimmed.length < 2 || trimmed.length > 60) {
        return NextResponse.json(
          { error: 'Görünen isim 2-60 karakter arasında olmalıdır' },
          { status: 400 }
        );
      }
      updatePayload['display_name'] = trimmed;
    }

    if (typeof bio === 'string') {
      if (bio.length > 300) {
        return NextResponse.json(
          { error: 'Biyografi en fazla 300 karakter olabilir' },
          { status: 400 }
        );
      }
      updatePayload['bio'] = bio.trim();
    }

    if (typeof avatarUrl === 'string') {
      updatePayload['avatar_url'] = avatarUrl.trim();
    }

    let queryResult;
    try {
      const { data, error } = await supabaseAdmin
        .from('kullanicilar')
        .update(updatePayload)
        .eq('id', decoded.uid)
        .select('*')
        .single();
      
      if (error) throw error;
      queryResult = data;
    } catch (err: any) {
      if (
        err.message?.includes('allow_mentions') || 
        err.message?.includes('school_email') || 
        err.message?.includes('phone_number') || 
        err.code === '42703'
      ) {
        console.warn('[User Update] Eksik kolon hatası, veritabanı şeması güncel olmayabilir. Güvenli fallback modda deneniyor...');
        delete updatePayload['allow_mentions'];
        delete updatePayload['school_email'];
        delete updatePayload['phone_number'];
        const { data, error: retryError } = await supabaseAdmin
          .from('kullanicilar')
          .update(updatePayload)
          .eq('id', decoded.uid)
          .select('*')
          .single();
        if (retryError) throw retryError;
        queryResult = data;
      } else {
        throw err;
      }
    }

    // Etiket/İlgi alanları (topics) güncelleniyor
    if (Array.isArray(topics)) {
      // 1. Önceki ilgi alanlarını temizle
      const { error: deleteErr } = await supabaseAdmin
        .from('yazar_konulari')
        .delete()
        .eq('yazar_id', decoded.uid);

      if (deleteErr) throw deleteErr;

      // 2. Yeni ilgi alanlarını ekle
      if (topics.length > 0) {
        const insertRows = topics.map((topicId) => ({
          yazar_id: decoded.uid,
          konu_id: topicId,
        }));

        const { error: insertErr } = await supabaseAdmin
          .from('yazar_konulari')
          .insert(insertRows);

        if (insertErr) throw insertErr;
      }
    }

    return NextResponse.json({ user: queryResult });
  } catch (err) {
    console.error('[User Update API] Hata:', err);
    return NextResponse.json({ error: 'Profil güncellenemedi' }, { status: 500 });
  }
}
