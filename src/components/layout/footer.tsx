import Link from 'next/link';
import { Github, Twitter, Instagram, Heart } from 'lucide-react';

const footerLinks = {
  platform: [
    { href: '/makale', label: 'Makaleler' },
    { href: '/kesfet', label: 'Keşfet' },
    { href: '/forum', label: 'Kampüs Forum' },
    { href: '/basvuru', label: 'Yazar Ol' },
  ],
  topluluk: [
    { href: '/hakkimizda', label: 'Hakkımızda' },
    { href: '/iletisim', label: 'İletişim' },
    { href: '/sozlesmeler/kvkk', label: 'KVKK ve Gizlilik Politikası' },
    { href: '/sozlesmeler/kullanici-sozlesmesi', label: 'Kullanıcı Sözleşmesi' },
  ],
};

export default function Footer() {
  return (
    <footer className="border-t border-border bg-card/50 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">

          {/* Marka */}
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-erciyes-red to-red-900 flex items-center justify-center">
                <span className="text-white font-black text-sm">Z</span>
              </div>
              <span className="font-bold text-lg text-foreground">
                Zirve<span className="text-erciyes-red">Kampüs</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed mb-4">
              ZirveKampüs öğrenciler için bağımsız bir makale okuma, yazar keşfetme 
              ve kampüs tartışma platformudur. Bilgi üret, fikir paylaş.
            </p>
            <p className="text-[10px] text-muted-foreground/60 leading-normal max-w-xs border-l border-border/80 pl-3">
              ⚠️ Bu bağımsız bir öğrenci projesidir. Üniversite rektörlüğü veya idari birimleriyle resmi veya organik hiçbir bağı bulunmamaktadır.
            </p>
            <div className="flex items-center gap-3 mt-5">
              <a href="#" className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" aria-label="Twitter">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="#" className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" aria-label="Instagram">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="#" className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" aria-label="GitHub">
                <Github className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Platform Linkleri */}
          <div>
            <h3 className="font-semibold text-sm mb-4">Platform</h3>
            <ul className="flex flex-col gap-3">
              {footerLinks.platform.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground hover:text-erciyes-red transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Topluluk Linkleri */}
          <div>
            <h3 className="font-semibold text-sm mb-4">Topluluk</h3>
            <ul className="flex flex-col gap-3">
              {footerLinks.topluluk.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground hover:text-erciyes-red transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Alt Çizgi */}
        <div className="border-t border-border mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} ZirveKampüs. Tüm hakları saklıdır.
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            ZirveKampüs bağımsız bir öğrenci projesidir
            <Heart className="w-3 h-3 text-erciyes-red fill-erciyes-red ml-1" />
          </p>
        </div>
      </div>
    </footer>
  );
}
