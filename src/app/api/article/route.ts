import { NextResponse } from 'next/server';
import { verifyFirebaseToken } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/server';
import slugify from 'slugify';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get('limit')) || 10;
    const authorId = searchParams.get('authorId');
    const status = searchParams.get('status') || 'published';
    const topicId = searchParams.get('topicId');

    let query = supabaseAdmin
      .from('makaleler')
      .select(`
        *,
        author:kullanicilar!makaleler_author_id_fkey(username, display_name, avatar_url, fakulte),
        makale_konulari!left(konu_id)
      `)
      .order('created_at', { ascending: false });

    if (authorId) {
      query = query.eq('author_id', authorId);
    }
    
    if (status) {
      query = query.eq('status', status);
    }

    if (limit) {
      query = query.limit(limit);
    }

    const { data: articles, error } = await query;

    if (error) {
      console.error('[Article GET] Hata:', error);
      return NextResponse.json({ error: 'Makaleler çekilemedi.' }, { status: 500 });
    }

    let filtered = articles || [];
    if (topicId) {
      filtered = filtered.filter((art: any) => 
        art.makale_konulari?.some((mk: any) => mk.konu_id === Number(topicId))
      );
    }

    return NextResponse.json(filtered);
  } catch (error) {
    console.error('[Article GET] Sunucu Hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await verifyFirebaseToken(token);
    const userId = decodedToken.uid;

    const { data: user, error: userErr } = await supabaseAdmin
      .from('kullanicilar')
      .select('role')
      .eq('id', userId)
      .single();

    if (userErr || !user || !['yazar', 'editor', 'admin'].includes(user.role)) {
      return NextResponse.json({ error: 'Bu işlem için yazar olmalısınız.' }, { status: 403 });
    }

    const body = await request.json();
    const { id, title, content, excerpt, coverImage, topicId, status = 'draft' } = body;

    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json({ error: 'Başlık ve içerik zorunludur.' }, { status: 400 });
    }

    const generatedExcerpt = excerpt?.trim() || content.replace(/<[^>]*>/g, '').slice(0, 150) + '...';
    
    const baseSlug = slugify(title.toLowerCase().trim(), {
      locale: 'tr',
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g
    });
    const uniqueSlug = `${baseSlug}-${Date.now().toString().slice(-4)}`;

    let articleResult;

    if (id) {
      const { data: existingArt } = await supabaseAdmin
        .from('makaleler')
        .select('author_id')
        .eq('id', id)
        .single();

      if (!existingArt || existingArt.author_id !== userId) {
        return NextResponse.json({ error: 'Bu makaleyi düzenleme yetkiniz yok.' }, { status: 403 });
      }

      const { data, error } = await supabaseAdmin
        .from('makaleler')
        .update({
          title,
          content,
          excerpt: generatedExcerpt,
          cover_image: coverImage || null,
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[Article POST Update] Hata:', error);
        return NextResponse.json({ error: 'Makale güncellenemedi.' }, { status: 500 });
      }
      articleResult = data;
    } else {
      const { data, error } = await supabaseAdmin
        .from('makaleler')
        .insert({
          title,
          slug: uniqueSlug,
          content,
          excerpt: generatedExcerpt,
          cover_image: coverImage || null,
          author_id: userId,
          status,
        })
        .select()
        .single();

      if (error) {
        console.error('[Article POST Insert] Hata:', error);
        return NextResponse.json({ error: 'Makale oluşturulamadı.' }, { status: 500 });
      }
      articleResult = data;
    }

    if (topicId && articleResult) {
      await supabaseAdmin
        .from('makale_konulari')
        .delete()
        .eq('makale_id', articleResult.id);

      const { error: topicErr } = await supabaseAdmin
        .from('makale_konulari')
        .insert({
          makale_id: articleResult.id,
          konu_id: Number(topicId),
        });

      if (topicErr) {
        console.error('[Article POST Topic] Hata:', topicErr);
      }
    }

    return NextResponse.json({ success: true, article: articleResult });
  } catch (error) {
    console.error('[Article POST] Sunucu Hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await verifyFirebaseToken(token);
    const userId = decodedToken.uid;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Makale id gereklidir.' }, { status: 400 });
    }

    const { data: article } = await supabaseAdmin
      .from('makaleler')
      .select('author_id')
      .eq('id', id)
      .single();

    if (!article || article.author_id !== userId) {
      return NextResponse.json({ error: 'Bu makaleyi silme yetkiniz yok.' }, { status: 403 });
    }

    const { error } = await supabaseAdmin
      .from('makaleler')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: 'Makale silinemedi.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Article DELETE] Hata:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
