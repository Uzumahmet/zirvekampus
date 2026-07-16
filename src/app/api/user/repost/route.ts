import { NextResponse } from 'next/server';
import { verifyFirebaseToken } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await verifyFirebaseToken(token);
    const userId = decodedToken.uid;

    const body = await request.json();
    const { ogeId, ogeTipi } = body; // ogeTipi: 'article' | 'forum' | 'project'

    if (!ogeId || !['article', 'forum', 'project'].includes(ogeTipi)) {
      return NextResponse.json({ error: 'Geçersiz parametreler.' }, { status: 400 });
    }

    // 1. __reposts isimli koleksiyonu bul veya oluştur
    let { data: collection, error: findError } = await supabaseAdmin
      .from('koleksiyonlar')
      .select('id')
      .eq('user_id', userId)
      .eq('name', '__reposts')
      .maybeSingle();

    if (!collection) {
      const { data: newCol, error: createError } = await supabaseAdmin
        .from('koleksiyonlar')
        .insert({
          user_id: userId,
          name: '__reposts',
          description: 'Yeniden Paylaşılanlar',
          is_public: true
        })
        .select('id')
        .single();

      if (createError || !newCol) {
        console.error('[Repost API] Koleksiyon oluşturulamadı:', createError);
        return NextResponse.json({ error: 'İşlem başarısız oldu.' }, { status: 500 });
      }
      collection = newCol;
    }

    // 2. Öğenin zaten repost edilip edilmediğini kontrol et
    const { data: existingOge } = await supabaseAdmin
      .from('koleksiyon_ogeleri')
      .select('*')
      .eq('koleksiyon_id', collection.id)
      .eq('oge_id', ogeId)
      .eq('oge_tipi', ogeTipi)
      .maybeSingle();

    if (existingOge) {
      // Zaten repost edilmişse, repostu kaldır (Toggle)
      const { error: deleteError } = await supabaseAdmin
        .from('koleksiyon_ogeleri')
        .delete()
        .eq('koleksiyon_id', collection.id)
        .eq('oge_id', ogeId)
        .eq('oge_tipi', ogeTipi);

      if (deleteError) {
        return NextResponse.json({ error: 'Yeniden paylaşım kaldırılamadı.' }, { status: 500 });
      }

      return NextResponse.json({ success: true, reposted: false });
    } else {
      // Repost et
      const { error: insertError } = await supabaseAdmin
        .from('koleksiyon_ogeleri')
        .insert({
          koleksiyon_id: collection.id,
          oge_id: ogeId,
          oge_tipi: ogeTipi
        });

      if (insertError) {
        return NextResponse.json({ error: 'Yeniden paylaşılamadı.' }, { status: 500 });
      }

      return NextResponse.json({ success: true, reposted: true });
    }
  } catch (error) {
    console.error('[Repost API] Sunucu hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// GET: Öğenin aktif kullanıcı tarafından repost edilip edilmediğini kontrol eder
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ogeId = searchParams.get('ogeId');
    const ogeTipi = searchParams.get('ogeTipi');
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ reposted: false });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await verifyFirebaseToken(token);
    const userId = decodedToken.uid;

    if (!ogeId || !ogeTipi) {
      return NextResponse.json({ reposted: false });
    }

    const { data: collection } = await supabaseAdmin
      .from('koleksiyonlar')
      .select('id')
      .eq('user_id', userId)
      .eq('name', '__reposts')
      .maybeSingle();

    if (!collection) {
      return NextResponse.json({ reposted: false });
    }

    const { data: oge } = await supabaseAdmin
      .from('koleksiyon_ogeleri')
      .select('*')
      .eq('koleksiyon_id', collection.id)
      .eq('oge_id', ogeId)
      .eq('oge_tipi', ogeTipi)
      .maybeSingle();

    return NextResponse.json({ reposted: !!oge });
  } catch {
    return NextResponse.json({ reposted: false });
  }
}
