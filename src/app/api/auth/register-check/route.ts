import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, username } = body as { email: string; username: string };

    if (!email || !username) {
      return NextResponse.json({ error: 'E-posta ve kullanıcı adı gereklidir.' }, { status: 400 });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    // 1. Kullanıcı adının benzersizliğini kontrol et
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('kullanicilar')
      .select('id')
      .eq('username', cleanUsername)
      .maybeSingle();

    if (checkError) throw checkError;
    if (existingUser) {
      return NextResponse.json({ error: 'Bu kullanıcı adı zaten alınmış.' }, { status: 400 });
    }

    // 2. Bu e-posta ile (plus kısmı atılmış base_email) kaç hesap açılmış?
    const baseEmail = cleanEmail.replace(/\+[^@]+/, '');

    const { data: accounts, error: countError } = await supabaseAdmin
      .from('kullanicilar')
      .select('id')
      .or(`base_email.eq.${baseEmail},email.eq.${baseEmail},email.ilike.${baseEmail.replace('@', '+%@')}`);

    if (countError) throw countError;

    if (accounts && accounts.length >= 3) {
      return NextResponse.json(
        { error: 'Bu e-posta adresi ile en fazla 3 hesap oluşturabilirsiniz.' },
        { status: 400 }
      );
    }

    // E-posta ve kullanıcı adı uygun! Kayıt esnasında kullanılacak olan plus-addressed email adresini de dönelim.
    // Eğer bu e-posta ile zaten hesap varsa plus-addressed email oluştururuz, yoksa orijinalini kullanabiliriz.
    let targetRegisterEmail = cleanEmail;
    if (accounts && accounts.length > 0) {
      // Zaten en az 1 hesap var, Firebase benzersizliği için plus ekle
      const [localPart, domainPart] = baseEmail.split('@');
      targetRegisterEmail = `${localPart}+${cleanUsername}@${domainPart}`;
    }

    return NextResponse.json({ 
      success: true, 
      registerEmail: targetRegisterEmail,
      baseEmail: baseEmail
    });
  } catch (error) {
    console.error('Kayıt kontrol hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
