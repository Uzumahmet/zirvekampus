import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';

export const metadata: Metadata = {
  title: 'KVKK & Gizlilik Politikası | ZirveKampüs',
  description: 'ZirveKampüs Kişisel Verilerin Korunması Kanunu ve gizlilik politikası bildirgesi.',
};

export default function KvkkPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <Link
        href="/giris-yap"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground mb-8 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Giriş / Kayıt Ekranına Dön
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
          <Shield className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">KVKK & Gizlilik Bildirgesi</h1>
      </div>

      <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-sm text-muted-foreground leading-relaxed">
        <p className="font-semibold text-foreground">
          Son Güncelleme: 5 Temmuz 2026
        </p>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">1. Veri Sorumlusu</h2>
          <p>
            Bu aydınlatma metni, 6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) uyarınca, tamamen bağımsız bir öğrenci projesi olan <strong>ZirveKampüs</strong> üyelerinin kişisel verilerinin işlenmesi süreçlerine ilişkin bilgilendirme amacıyla hazırlanmıştır. Ticari bir şirket olmayıp bağımsız bir öğrenci girişimi olduğu için resmi bir tüzel veri sorumlusu bulunmamaktadır.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">2. İşlenen Kişisel Verileriniz</h2>
          <p>
            Platforma üye olurken ve platformu kullanırken aşağıdaki kişisel verileriniz işlenmektedir:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Kimlik ve İletişim Bilgileri:</strong> E-posta adresiniz, kullanıcı adınız, görünen adınız.</li>
            <li><strong>Eğitim Bilgisi:</strong> Kayıtlı olduğunuz fakülte bilgisi (bu bilgi onboarding esnasında zorunlu tutulmaktadır ancak dilerseniz profilinizden gizleyebilirsiniz).</li>
            <li><strong>Kullanıcı İçeriği:</strong> Profil fotoğrafınız, biyografiniz, yayınladığınız makaleler, forum entryleri, beğeni ve takipçi bilgileriniz.</li>
            <li><strong>Teknik Veriler:</strong> Firebase Authentication logları, IP adresi ve oturum verileri.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">3. Verilerinizin İşlenme Amacı</h2>
          <p>
            Kişisel verileriniz, yalnızca platformun teknik olarak çalışması, oturumlarınızın güvende tutulması, makale ve forum paylaşımlarınızın yazar adıyla eşleştirilmesi, Hesaplar Merkezi üzerinden bağlı hesaplarınız arasında hızlı geçişin sağlanması amaçlarıyla işlenmektedir. Verileriniz hiçbir şekilde ticari amaçla satılmamakta veya reklam şirketleriyle paylaşılmamaktadır.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">4. Fakülte Bilgisinin Gizliliği</h2>
          <p>
            ZirveKampüs üzerinde akademik seviyede yardımlaşmayı artırmak adına <strong>Fakülte bilgisi girmek zorunludur</strong>. Ancak gizliliğinize önem veriyoruz; dilediğiniz takdirde profil düzenleme formunda yer alan <strong>&quot;Fakülte bilgimi profilimde gizle&quot;</strong> seçeneğini işaretleyerek bu bilginin profilinizde ve keşfet aramalarında diğer kullanıcılara gösterilmesini tamamen kapatabilirsiniz.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">5. Üçüncü Kişilere Veri Aktarımı</h2>
          <p>
            Veritabanı altyapımız <strong>Firebase (Google)</strong> ve <strong>Supabase</strong> bulut sistemleri üzerinde barındırılmaktadır. Verileriniz güvenlik ve depolama servisleri dışında hiçbir üçüncü parti kurum veya şahısla paylaşılmamaktadır.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">6. Haklarınız ve Veri Silme</h2>
          <p>
            Dilediğiniz zaman Hesaplar Merkezi panelinden <strong>&quot;Hesabımı Sil&quot;</strong> butonunu kullanarak platformdaki tüm kişisel verilerinizi, makalelerinizi, forum geçmişinizi ve oturum detaylarınızı kalıcı olarak silebilirsiniz. Bu işlem geri alınamaz.
          </p>
        </section>
      </div>
    </div>
  );
}
