import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ShieldAlert } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Kullanıcı Sözleşmesi | ZirveKampüs',
  description: 'ZirveKampüs kullanıcı sözleşmesi ve sorumluluk reddi beyanı.',
};

export default function KullaniciSozlesmesiPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <Link
        href="/giris-yap"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground mb-8 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Giriş / Kayıt Ekranına Dön
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Kullanıcı Sözleşmesi & Sorumluluk Reddi</h1>
      </div>

      <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-sm text-muted-foreground leading-relaxed">
        <p className="font-semibold text-foreground">
          Son Güncelleme: 5 Temmuz 2026
        </p>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">1. Projenin Niteliği</h2>
          <p>
            <strong>ZirveKampüs</strong> (bundan böyle &quot;Platform&quot; veya &quot;ZirveKampüs&quot; olarak anılacaktır), Erciyes Üniversitesi öğrencilerinin kendi aralarında yardımlaşması, bilgi paylaşması ve akademik/kültürel içerik üretmesi amacıyla hayata geçirilmiş <strong>tamamen bağımsız bir öğrenci projesidir</strong>. 
          </p>
          <p>
            Platformun Erciyes Üniversitesi rektörlüğü, idari birimleri, fakülteleri veya herhangi bir resmi üniversite organı ile hiçbir organik bağı, resmi temsilciliği ya da iş birliği bulunmamaktadır.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">2. Sorumluluk Reddi (No Responsibility Disclaimer)</h2>
          <p className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 text-destructive-foreground/90 font-medium">
            ZirveKampüs yönetimi, kurucuları, geliştiricileri veya katkıda bulunan öğrencileri; platformda yayınlanan makalelerin, forum başlıklarının, yorumların veya paylaşılan koleksiyonların doğruluğundan, içeriğinden, yasallığından veya bu içeriklerin oluşturabileceği doğrudan ya da dolaylı zararlardan ötürü <strong>HİÇBİR ŞEKİLDE SORUMLULUK KABUL ETMEMEKTEDİR</strong>.
          </p>
          <p>
            Platformda yer alan tüm içerikler, görseller, fikirler ve yorumlar tamamen yazarların ve üyelerin kendi sorumluluğundadır. Kullanıcılar tarafından paylaşılan linklerin güvenliği, indirilmeye sunulan dosyaların virüs/zararlı yazılım barındırmaması veya akademik bilgilerin doğruluğu garanti edilmez.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">3. Hesap Güvenliği ve Çoklu Hesaplar</h2>
          <p>
            Kullanıcılar platforma kayıt olurken kendilerine ait benzersiz bir kullanıcı adı ve şifre belirler. Bir kullanıcı, aynı e-posta adresi ile en fazla 3 ayrı alt hesap/profil oluşturabilir. Hesapların şifre güvenliği, oturumların üçüncü şahıslara kaptırılmaması tamamen kullanıcının sorumluluğundadır. 
          </p>
          <p>
            Bağlı hesaplar ve Hesaplar Merkezi üzerinden yapılacak hızlı hesap geçişlerinde oluşabilecek tarayıcı bazlı güvenlik açıkları, paylaşımlı cihazlarda oturumların açık unutulması gibi durumlardan ötürü ZirveKampüs sorumluluk kabul etmez.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">4. İçerik Denetimi ve Hesap Kapatma</h2>
          <p>
            ZirveKampüs moderatörleri; Türkiye Cumhuriyeti kanunlarına aykırı, hakaret içeren, telif hakkı ihlali barındıran, üniversite etik kurallarına uymayan veya spam niteliğindeki içerikleri önceden haber vermeksizin silme, değiştirme ve ilgili üyenin hesabını askıya alma/silme hakkını saklı tutar.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">5. Yürürlük</h2>
          <p>
            Bu sözleşme, kullanıcının kayıt olma formundaki onay kutucuğunu (checkbox) işaretlemesi ve hesabı başarıyla oluşturmasıyla birlikte yürürlüğe girer. Platformu kullanan tüm ziyaretçiler ve üyeler bu koşulları peşinen kabul etmiş sayılırlar.
          </p>
        </section>
      </div>
    </div>
  );
}
