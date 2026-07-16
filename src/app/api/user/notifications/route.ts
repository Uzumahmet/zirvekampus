import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { verifyFirebaseToken } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await verifyFirebaseToken(token);
    const userId = decodedToken.uid;

    const notificationsList: any[] = [];

    // 1. Takipçileri çek (yazar_takip)
    const { data: followers } = await supabaseAdmin
      .from('yazar_takip')
      .select('takipci_id, created_at, follower:kullanicilar!yazar_takip_takipci_id_fkey(username, display_name, avatar_url)')
      .eq('yazar_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (followers) {
      followers.forEach((f: any) => {
        if (f.follower) {
          notificationsList.push({
            id: `follow-${f.takipci_id}-${f.created_at}`,
            type: 'follow',
            user: f.follower,
            message: 'seni takip etmeye başladı.',
            created_at: f.created_at
          });
        }
      });
    }

    // 2. Profil beğenilerini çek (yazar_begeni)
    const { data: likes } = await supabaseAdmin
      .from('yazar_begeni')
      .select('kullanici_id, created_at, liker:kullanicilar!yazar_begeni_kullanici_id_fkey(username, display_name, avatar_url)')
      .eq('yazar_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (likes) {
      likes.forEach((l: any) => {
        if (l.liker) {
          notificationsList.push({
            id: `like-${l.kullanici_id}-${l.created_at}`,
            type: 'like',
            user: l.liker,
            message: 'profilini beğendi.',
            created_at: l.created_at
          });
        }
      });
    }

    // 3. Proje Beğenileri ve Yorumları
    const { data: myProjects } = await supabaseAdmin
      .from('projeler')
      .select('id, title')
      .eq('author_id', userId);

    const myProjectIds = myProjects?.map(p => p.id) || [];

    if (myProjectIds.length > 0) {
      // Proje Beğenileri
      const { data: pLikes } = await supabaseAdmin
        .from('proje_begeniler')
        .select('kullanici_id, project_id, created_at, liker:kullanicilar(username, display_name, avatar_url)')
        .in('project_id', myProjectIds)
        .order('created_at', { ascending: false })
        .limit(20);

      if (pLikes) {
        pLikes.forEach((pl: any) => {
          if (pl.liker && pl.kullanici_id !== userId) {
            const project = myProjects?.find(p => p.id === pl.project_id);
            notificationsList.push({
              id: `project-like-${pl.kullanici_id}-${pl.created_at}`,
              type: 'project_like',
              user: pl.liker,
              message: `"${project?.title || 'projenizi'}" beğendi.`,
              created_at: pl.created_at,
              link: `/projeler/${pl.project_id}`
            });
          }
        });
      }

      // Proje Yorumları
      const { data: pComments } = await supabaseAdmin
        .from('proje_yorumlar')
        .select('author_id, project_id, content, created_at, commenter:kullanicilar(username, display_name, avatar_url)')
        .in('project_id', myProjectIds)
        .order('created_at', { ascending: false })
        .limit(20);

      if (pComments) {
        pComments.forEach((pc: any) => {
          if (pc.commenter && pc.author_id !== userId) {
            const project = myProjects?.find(p => p.id === pc.project_id);
            notificationsList.push({
              id: `project-comment-${pc.author_id}-${pc.created_at}`,
              type: 'project_comment',
              user: pc.commenter,
              message: `"${project?.title || 'projenize'}" yorum yaptı: "${pc.content.slice(0, 30)}..."`,
              created_at: pc.created_at,
              link: `/projeler/${pc.project_id}`
            });
          }
        });
      }
    }

    // 4. Makale Kaydedilmeleri
    const { data: myArticles } = await supabaseAdmin
      .from('makaleler')
      .select('id, title, slug')
      .eq('author_id', userId);

    const myArticleIds = myArticles?.map(a => a.id) || [];

    if (myArticleIds.length > 0) {
      const { data: aSaves } = await supabaseAdmin
        .from('kaydedilen_makaleler')
        .select('kullanici_id, makale_id, created_at, saver:kullanicilar(username, display_name, avatar_url)')
        .in('makale_id', myArticleIds)
        .order('created_at', { ascending: false })
        .limit(20);

      if (aSaves) {
        aSaves.forEach((asv: any) => {
          if (asv.saver && asv.kullanici_id !== userId) {
            const article = myArticles?.find(a => a.id === asv.makale_id);
            notificationsList.push({
              id: `article-save-${asv.kullanici_id}-${asv.created_at}`,
              type: 'article_save',
              user: asv.saver,
              message: `"${article?.title || 'makalenizi'}" kaydetti.`,
              created_at: asv.created_at,
              link: `/makale/${article?.slug}`
            });
          }
        });
      }
    }

    // 5. Bahsetmeler (Mentions)
    const { data: currentUser } = await supabaseAdmin
      .from('kullanicilar')
      .select('username')
      .eq('id', userId)
      .single();

    const myUsername = currentUser?.username;

    if (myUsername) {
      const mentionPattern = `%@${myUsername}%`;

      // Proje yorumlarındaki bahsetmeler
      const { data: commentMentions } = await supabaseAdmin
        .from('proje_yorumlar')
        .select('author_id, project_id, content, created_at, commenter:kullanicilar(username, display_name, avatar_url)')
        .neq('author_id', userId)
        .ilike('content', mentionPattern)
        .order('created_at', { ascending: false })
        .limit(10);

      if (commentMentions) {
        commentMentions.forEach((m: any) => {
          if (m.commenter) {
            notificationsList.push({
              id: `mention-comment-${m.author_id}-${m.created_at}`,
              type: 'mention',
              user: m.commenter,
              message: `bir yorumda senden bahsetti: "${m.content.slice(0, 30)}..."`,
              created_at: m.created_at,
              link: `/projeler/${m.project_id}`
            });
          }
        });
      }

      // Forum entrylerindeki bahsetmeler
      const { data: entryMentions } = await supabaseAdmin
        .from('forum_entryleri')
        .select('author_id, topic_id, content, created_at, author:kullanicilar(username, display_name, avatar_url)')
        .neq('author_id', userId)
        .ilike('content', mentionPattern)
        .order('created_at', { ascending: false })
        .limit(10);

      if (entryMentions) {
        entryMentions.forEach((em: any) => {
          if (em.author) {
            notificationsList.push({
              id: `mention-entry-${em.author_id}-${em.created_at}`,
              type: 'mention',
              user: em.author,
              message: `bir forum yazısında senden bahsetti: "${em.content.slice(0, 30)}..."`,
              created_at: em.created_at,
              link: `/forum`
            });
          }
        });
      }
    }

    // 6. Takip Edilenlerin Yeni Gönderileri (Son 48 saat)
    const { data: followingList } = await supabaseAdmin
      .from('yazar_takip')
      .select('yazar_id')
      .eq('takipci_id', userId);

    const followedUserIds = followingList?.map(f => f.yazar_id) || [];

    if (followedUserIds.length > 0) {
      const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      const { data: newProjects } = await supabaseAdmin
        .from('projeler')
        .select('id, title, created_at, fakulte, author:kullanicilar(username, display_name, avatar_url)')
        .in('author_id', followedUserIds)
        .gt('created_at', twoDaysAgo)
        .order('created_at', { ascending: false })
        .limit(15);

      if (newProjects) {
        newProjects.forEach((p: any) => {
          if (p.author) {
            const isPost = p.fakulte === 'gonderi';
            notificationsList.push({
              id: `newpost-${p.id}-${p.created_at}`,
              type: 'new_post',
              user: p.author,
              message: isPost ? 'yeni bir gönderi paylaştı.' : `yeni bir proje yayınladı: "${p.title}"`,
              created_at: p.created_at,
              link: isPost ? '/' : `/projeler/${p.id}`
            });
          }
        });
      }
    }

    // Tarihe göre azalan sıralama (En yeni en üstte)
    notificationsList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({ notifications: notificationsList });
  } catch (error) {
    console.error('[Notifications API] Sunucu hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
