import type { Metadata } from 'next';
import HesaplarMerkezi from './hesaplar-merkezi';

export const metadata: Metadata = {
  title: 'Hesaplar Merkezi | ZirveKampüs',
  description: 'Çoklu hesaplarınızı yönetin, şifresiz hızlı geçiş yapın ve güvenlik ayarlarınızı kontrol edin.',
};

export default function HesaplarAyarlariPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <HesaplarMerkezi />
    </div>
  );
}
