import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyFirebaseToken } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/server';
import { extractBearerToken } from '@/lib/utils';

export const runtime = 'nodejs';

// GET /api/user/suggestions
// Takip edilecek kişileri çeken algoritma
export async function GET(request: NextRequest) {
  let currentUserId: string | null = null;
  const token = extractBearerToken(request.headers.get('Authorization'));

  if (token) {
    try {
      const decoded = await verifyFirebaseToken(token);
      currentUserId = decoded.uid;
    } catch (e) {
      console.warn('[Suggestions API] Geçersiz token:', e);
    }
  }

  try {
    let myFaculty: string | null = null;
    let followingIds: string[] = [];

    // 1. Kullanıcı bilgilerini ve takip ettiklerini al
    if (currentUserId) {
      const { data: userProfile } = await supabaseAdmin
        .from('kullanicilar')
        .select('fakulte')
        .eq('id', currentUserId)
        .single();

      myFaculty = userProfile?.fakulte || null;

      const { data: followingRecords } = await supabaseAdmin
        .from('yazar_takip')
        .select('yazar_id')
        .eq('takipci_id', currentUserId);

      followingIds = (followingRecords ?? []).map((r) => r.yazar_id);
    }

    // Kendimizi ve zaten takip ettiklerimizi dışlamak için bir liste
    const excludedIds = [currentUserId, ...followingIds].filter(Boolean) as string[];

    let suggestedUsers: any[] = [];

    // 2. Kendi fakültesindeki kişileri çek
    if (myFaculty) {
      let query = supabaseAdmin
        .from('kullanicilar')
        .select('*')
        .eq('fakulte', myFaculty)
        .eq('onboarded', true);

      if (excludedIds.length > 0) {
        query = query.not('id', 'in', `(${excludedIds.join(',')})`);
      }

      const { data: facultyUsers } = await query.limit(5);
      if (facultyUsers) {
        suggestedUsers = [...facultyUsers];
      }
    }

    // Eğer kendi fakültesinden yeterince kişi bulunamadıysa veya giriş yapılmadıysa popüler kişileri çek
    const currentCount = suggestedUsers.length;
    if (currentCount < 5) {
      const newExcludeIds = [...excludedIds, ...suggestedUsers.map((u) => u.id)];
      
      let query = supabaseAdmin
        .from('kullanicilar')
        .select('*')
        .eq('onboarded', true);

      if (newExcludeIds.length > 0) {
        query = query.not('id', 'in', `(${newExcludeIds.join(',')})`);
      }

      const { data: generalUsers } = await query.limit(8 - currentCount);
      if (generalUsers) {
        suggestedUsers = [...suggestedUsers, ...generalUsers];
      }
    }

    // Her öneri için takipçi sayısı ve son makale gibi istatistikleri çekelim
    const formattedSuggestions = await Promise.all(
      suggestedUsers.map(async (user) => {
        const [takipciCount, makaleCount] = await Promise.all([
          supabaseAdmin
            .from('yazar_takip')
            .select('*', { count: 'exact', head: true })
            .eq('yazar_id', user.id),
          supabaseAdmin
            .from('makaleler')
            .select('*', { count: 'exact', head: true })
            .eq('author_id', user.id)
            .eq('status', 'published'),
        ]);

        return {
          id: user.id,
          username: user.username,
          display_name: user.display_name,
          avatar_url: user.avatar_url,
          fakulte: user.fakulte_gizli ? null : user.fakulte,
          bio: user.bio,
          follower_count: takipciCount.count ?? 0,
          article_count: makaleCount.count ?? 0,
        };
      })
    );

    // Takipçi sayısına göre sıralayalım
    formattedSuggestions.sort((a, b) => b.follower_count - a.follower_count);

    return NextResponse.json(formattedSuggestions);
  } catch (err) {
    console.error('[Suggestions GET Error]', err);
    return NextResponse.json({ error: 'Takip önerileri alınamadı' }, { status: 500 });
  }
}
