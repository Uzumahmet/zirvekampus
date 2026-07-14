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
    const { displayName, bio, avatarUrl, username, fakulte, fakulteGizli } = body as {
      displayName?: string;
      bio?: string;
      avatarUrl?: string;
      username?: string;
      fakulte?: string;
      fakulteGizli?: boolean;
    };

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

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

    const { data, error } = await supabaseAdmin
      .from('kullanicilar')
      .update(updatePayload)
      .eq('id', decoded.uid)
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ user: data });
  } catch (err) {
    console.error('[User Update API] Hata:', err);
    return NextResponse.json({ error: 'Profil güncellenemedi' }, { status: 500 });
  }
}
