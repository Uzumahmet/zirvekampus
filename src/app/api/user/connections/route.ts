import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { verifyFirebaseToken } from '@/lib/firebase/admin';
import { extractBearerToken } from '@/lib/utils';

export const runtime = 'nodejs';

/**
 * GET /api/user/connections
 * ─────────────────────────
 * Bir kullanıcının takipçilerini (followers) ve takip ettiklerini (following) getirir.
 * Query: ?username=kullanici_adi
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');

  if (!username) {
    return NextResponse.json({ error: 'Kullanıcı adı gerekli' }, { status: 400 });
  }

  try {
    // 1. Hedef kullanıcıyı bul
    const { data: targetUser, error: userError } = await supabaseAdmin
      .from('kullanicilar')
      .select('id')
      .eq('username', username)
      .single();

    if (userError || !targetUser) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
    }

    const userId = targetUser.id;

    // 2. Takipçileri getir (followers)
    // yazar_takip.yazar_id === userId
    const { data: followersRaw, error: followersError } = await supabaseAdmin
      .from('yazar_takip')
      .select('kullanicilar!yazar_takip_takipci_id_fkey(id, username, display_name, avatar_url, bio, role)')
      .eq('yazar_id', userId);

    if (followersError) throw followersError;

    // 3. Takip ettiklerini getir (following)
    // yazar_takip.takipci_id === userId
    const { data: followingRaw, error: followingError } = await supabaseAdmin
      .from('yazar_takip')
      .select('kullanicilar!yazar_takip_yazar_id_fkey(id, username, display_name, avatar_url, bio, role)')
      .eq('takipci_id', userId);

    if (followingError) throw followingError;

    const followers = (followersRaw ?? [])
      .map((f: any) => f.kullanicilar)
      .filter(Boolean);

    const following = (followingRaw ?? [])
      .map((f: any) => f.kullanicilar)
      .filter(Boolean);

    // 4. Eğer istek atan kullanıcı giriş yapmışsa, listedeki kişileri takip edip etmediğini kontrol et
    const authHeader = request.headers.get('Authorization');
    const token = extractBearerToken(authHeader);
    let myFollowingIds: string[] = [];

    if (token) {
      try {
        const decoded = await verifyFirebaseToken(token);
        const myUid = decoded.uid;

        // Kendi takip ettiklerimi çek
        const { data: myFollowingRaw } = await supabaseAdmin
          .from('yazar_takip')
          .select('yazar_id')
          .eq('takipci_id', myUid);

        myFollowingIds = (myFollowingRaw ?? []).map((f) => f.yazar_id);
      } catch (err) {
        console.warn('[Connections API] Token doğrulanamadı, auth bilgisi yok sayılıyor:', err);
      }
    }

    // Listelere isFollowing etiketini ekle
    const followersWithAuth = followers.map((u: any) => ({
      ...u,
      isFollowing: myFollowingIds.includes(u.id),
    }));

    const followingWithAuth = following.map((u: any) => ({
      ...u,
      isFollowing: myFollowingIds.includes(u.id),
    }));

    return NextResponse.json({
      followers: followersWithAuth,
      following: followingWithAuth,
    });
  } catch (err) {
    console.error('[Connections API] Hata:', err);
    return NextResponse.json({ error: 'Bağlantılar getirilemedi' }, { status: 500 });
  }
}
