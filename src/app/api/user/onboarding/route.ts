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
    const { displayName, bio, konular, makaleBasligi, makaleIcerigi, makaleKonuId, fakulte } = body;

    if (!fakulte || !fakulte.trim()) {
      return NextResponse.json({ error: 'Fakülte seçimi yapmak zorunludur.' }, { status: 400 });
    }

    // 1. Profil Güncelleme
    const { error: profileError } = await supabaseAdmin
      .from('kullanicilar')
      .update({
        display_name: displayName,
        bio: bio,
        fakulte: fakulte.trim(),
      })
      .eq('id', userId);

    if (profileError) {
      console.error('[Onboarding] Profil güncellenemedi:', profileError);
      return NextResponse.json({ error: `Profil güncellenemedi: ${profileError.message}` }, { status: 500 });
    }

    // 2. Yazar Konuları Kaydetme
    if (Array.isArray(konular) && konular.length > 0) {
      // Önce varsa eski konuları temizle
      await supabaseAdmin.from('yazar_konulari').delete().eq('yazar_id', userId);

      const konuEkleme = konular.map((konuId: number) => ({
        yazar_id: userId,
        konu_id: konuId,
      }));

      const { error: konularError } = await supabaseAdmin
        .from('yazar_konulari')
        .insert(konuEkleme);

      if (konularError) {
        console.error('[Onboarding] Konu ekleme hatası:', konularError);
        return NextResponse.json({ error: `Yazar konuları kaydedilemedi: ${konularError.message}` }, { status: 500 });
      }
    }

    // 3. İlk Taslak Makaleyi Oluşturma (Draft)
    if (makaleBasligi && makaleIcerigi) {
      // Slug oluştur
      const baseSlug = makaleBasligi
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-');
      const uniqueSlug = `${baseSlug}-${Date.now().toString().slice(-4)}`;

      const { data: newArticle, error: articleError } = await supabaseAdmin
        .from('makaleler')
        .insert({
          title: makaleBasligi,
          slug: uniqueSlug,
          content: makaleIcerigi,
          excerpt: makaleIcerigi.replace(/<[^>]*>/g, '').slice(0, 150) + '...',
          author_id: userId,
          status: 'draft', // Zorunlu olarak taslak oluşturuyoruz
        })
        .select()
        .single();

      if (articleError || !newArticle) {
        console.error('[Onboarding] Makale ekleme hatası:', articleError);
        return NextResponse.json({ error: `İlk taslak yazı oluşturulamadı: ${articleError?.message || 'Bilinmeyen veritabanı hatası'}` }, { status: 500 });
      }

      // Makaleye konu ilişkisini ekle
      if (makaleKonuId) {
        await supabaseAdmin
          .from('makale_konulari')
          .insert({
            makale_id: newArticle.id,
            konu_id: makaleKonuId,
          });
      }
    }

    // 4. Onboarding Tamamlandı İşareti
    const { error: onboardError } = await supabaseAdmin
      .from('kullanicilar')
      .update({ onboarded: true })
      .eq('id', userId);

    if (onboardError) {
      console.error('[Onboarding] Onboarding durumu güncellenemedi:', onboardError);
      return NextResponse.json({ error: `Onboarding durumu güncellenemedi: ${onboardError.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Onboarding hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
