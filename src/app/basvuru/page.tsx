'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/app/providers';
import { Loader2, PenTool, CheckCircle, AlertCircle, FileText, Send } from 'lucide-react';
import type { YazarBasvuru } from '@/types';

export default function BasvuruPage() {
  const router = useRouter();
  const { firebaseUser, dbUser, isLoading, isAuthenticated } = useAuth();
  
  const [reason, setReason] = useState('');
  const [sampleWriting, setSampleWriting] = useState('');
  const [existingBasvuru, setExistingBasvuru] = useState<YazarBasvuru | null>(null);
  const [basvuruLoading, setBasvuruLoading] = useState(true);
  
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Auth Kontrolü
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace('/giris-yap');
      return;
    }

    // Kullanıcı zaten yazar/editör/admin ise yazar paneline gönder
    if (dbUser && ['yazar', 'editor', 'admin'].includes(dbUser.role)) {
      router.replace('/');
      return;
    }

    // Var olan başvuru durumunu çek
    checkExistingBasvuru();
  }, [dbUser, isAuthenticated, isLoading, router]);

  const checkExistingBasvuru = async () => {
    if (!firebaseUser) return;
    try {
      const idToken = await firebaseUser.idToken;
      const res = await fetch('/api/author/apply', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setExistingBasvuru(data.basvuru);
      }
    } catch {
      console.error('Başvuru durumu sorgulanamadı.');
    } finally {
      setBasvuruLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || reason.length < 50) {
      setError('Lütfen yazar olma nedeninizi detaylıca açıklayın (en az 50 karakter).');
      return;
    }
    if (!sampleWriting.trim() || sampleWriting.length < 200) {
      setError('Lütfen en az 200 karakterlik bir örnek yazı yazın.');
      return;
    }

    setError('');
    startTransition(async () => {
      try {
        const idToken = await firebaseUser!.idToken;
        const res = await fetch('/api/author/apply', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ reason, sampleWriting }),
        });

        if (res.ok) {
          setSuccess(true);
          checkExistingBasvuru();
        } else {
          const data = await res.json();
          setError(data.error || 'Başvuru gönderilemedi.');
        }
      } catch {
        setError('Bağlantı hatası oluştu.');
      }
    });
  };

  if (isLoading || basvuruLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-erciyes-red" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Başlık */}
      <div className="mb-10 text-center sm:text-left">
        <div className="inline-flex p-3 rounded-2xl bg-erciyes-red/10 border border-erciyes-red/20 mb-4">
          <PenTool className="w-6 h-6 text-erciyes-red" />
        </div>
        <h1 className="text-4xl font-black tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
          Yazar Başvurusu
        </h1>
        <p className="text-muted-foreground text-sm mt-2 max-w-lg">
          Erciyes Kampüs platformunda makale yazmak, içerik üretmek ve topluluğa rehberlik etmek için yazarlık başvurusu yapın.
        </p>
      </div>

      {/* Durum Kartları */}
      {existingBasvuru ? (
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
          {existingBasvuru.status === 'pending' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-amber-500">
                <Loader2 className="w-6 h-6 animate-spin" />
                <h3 className="font-bold text-lg">Başvurunuz Değerlendiriliyor</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Yazarlık başvurunuz başarıyla alındı. Editör ekibimiz ve yöneticilerimiz örnek yazınızı ve profilinizi inceliyor. Onaylandığında hesabınız otomatik olarak yazar statüsüne yükseltilecektir.
              </p>
              <div className="p-4 bg-secondary/30 rounded-xl border border-border text-xs text-muted-foreground space-y-2">
                <span className="font-semibold block uppercase tracking-wider">Başvuru Bilgileriniz:</span>
                <div><strong>Neden:</strong> {existingBasvuru.reason}</div>
                <div><strong>Tarih:</strong> {new Date(existingBasvuru.created_at).toLocaleDateString('tr-TR')}</div>
              </div>
            </div>
          )}

          {existingBasvuru.status === 'approved' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-emerald-500">
                <CheckCircle className="w-6 h-6" />
                <h3 className="font-bold text-lg">Başvurunuz Onaylandı!</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Tebrikler, yazarlık başvurunuz onaylandı. Yazar panelinizi aktif etmek için şimdi anasayfaya gidebilirsiniz.
              </p>
              <button
                onClick={() => window.location.href = '/'}
                className="px-6 py-2.5 rounded-full bg-erciyes-red text-white text-sm font-semibold hover:bg-red-700 transition-colors"
              >
                Kuruluma Başla
              </button>
            </div>
          )}

          {existingBasvuru.status === 'rejected' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-rose-500">
                <AlertCircle className="w-6 h-6" />
                <h3 className="font-bold text-lg">Başvurunuz Olumsuz Sonuçlandı</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Yapılan incelemeler sonucunda başvurunuz bu aşamada onaylanamadı. 
                {existingBasvuru.review_notes && (
                  <span className="block mt-2 p-3 bg-rose-500/5 border border-rose-500/10 rounded-lg text-rose-400 font-medium">
                    Editör Notu: {existingBasvuru.review_notes}
                  </span>
                )}
              </p>
              <hr className="border-border" />
              <div className="pt-2">
                <h4 className="font-semibold text-sm mb-3">Tekrar Başvurmak İster misiniz?</h4>
                <button
                  onClick={async () => {
                    // Eski başvuruyu silme veya durumu sıfırlama işlemi için API çağırabiliriz
                    if (!firebaseUser) return;
                    const idToken = await firebaseUser.idToken;
                    await fetch('/api/author/apply/reset', {
                      method: 'POST',
                      headers: { Authorization: `Bearer ${idToken}` },
                    });
                    checkExistingBasvuru();
                  }}
                  className="px-5 py-2.5 rounded-full border border-border hover:bg-secondary text-xs font-semibold transition-colors"
                >
                  Yeni Başvuru Oluştur
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
          {error && (
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
              {error}
            </div>
          )}

          {/* Soru 1 */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground">
              1. Neden Yazar Olmak İstiyorsunuz?
            </label>
            <p className="text-xs text-muted-foreground">
              Platforma nasıl bir katkı sunmak istediğinizi detaylandırın. (En az 50 karakter)
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Yazmak istediğiniz alanlar, kampüsteki vizyonunuz..."
              rows={4}
              required
              className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:border-erciyes-red transition-all resize-none"
            />
          </div>

          {/* Soru 2 */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-erciyes-red" />
              2. Örnek Yazınız (Taslak Makale)
            </label>
            <p className="text-xs text-muted-foreground">
              Editörlerin kaleminizi değerlendirebilmesi için en az 200 karakterlik bir makale taslağı yazın.
            </p>
            <textarea
              value={sampleWriting}
              onChange={(e) => setSampleWriting(e.target.value)}
              placeholder="Başlık ve makale metnini buraya ekleyin..."
              rows={10}
              required
              className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:border-erciyes-red transition-all resize-none"
            />
            <div className="text-right text-[10px] text-muted-foreground">
              {sampleWriting.length} karakter (Minimum 200)
            </div>
          </div>

          {/* Gönder butonu */}
          <button
            type="submit"
            disabled={isPending}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-erciyes-red text-white text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-60 ml-auto shadow-lg"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Başvuruyu Gönder
          </button>
        </form>
      )}
    </div>
  );
}
