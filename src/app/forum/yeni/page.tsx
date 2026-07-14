'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers';
import { ArrowLeft, Loader2, Send, MessageSquarePlus } from 'lucide-react';
import Link from 'next/link';

export default function YeniBaslikPage() {
  const router = useRouter();
  const { firebaseUser, isAuthenticated, isLoading } = useAuth();
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  // Oturum Kontrolü: Giriş yapmamışsa giriş sayfasına yönlendir
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace('/giris-yap?redirect=/forum/yeni');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || title.length < 5) {
      setError('Başlık en az 5 karakter uzunluğunda olmalıdır.');
      return;
    }
    if (!content.trim() || content.length < 10) {
      setError('Mesaj içeriği en az 10 karakter uzunluğunda olmalıdır.');
      return;
    }

    setError('');
    startTransition(async () => {
      try {
        const idToken = await firebaseUser!.idToken;
        const res = await fetch('/api/forum/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ title, content }),
        });

        if (res.ok) {
          const data = await res.json();
          router.push(`/forum/${data.slug}`);
        } else {
          const data = await res.json();
          setError(data.error || 'Konu oluşturulurken bir hata oluştu.');
        }
      } catch {
        setError('Bağlantı hatası oluştu. Lütfen tekrar deneyin.');
      }
    });
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-erciyes-red" />
          <p className="text-sm text-muted-foreground font-semibold">Oturum kontrol ediliyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      {/* Geri Dön */}
      <Link
        href="/forum"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-erciyes-red transition-colors mb-8 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Foruma Dön
      </Link>

      {/* Başlık */}
      <div className="mb-8">
        <div className="inline-flex p-3 rounded-2xl bg-erciyes-red/10 border border-erciyes-red/20 mb-3">
          <MessageSquarePlus className="w-6 h-6 text-erciyes-red" />
        </div>
        <h1 className="text-3xl font-black tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
          Yeni Forum Başlığı Aç
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Kampüs hakkında merak ettiklerini sor, tartışma başlat veya duyurunu yap.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
        {error && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
            {error}
          </div>
        )}

        {/* Konu Başlığı */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Konu Başlığı
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Başlığınızı kısa ve net şekilde yazın..."
            required
            maxLength={100}
            className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-erciyes-red transition-all"
          />
          <span className="text-[10px] text-muted-foreground block text-right">
            {title.length}/100 karakter
          </span>
        </div>

        {/* İlk Mesaj (İçerik) */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Mesajınız
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Tartışma konusunu detaylandırın. Sorunuzu veya görüşlerinizi buraya yazın..."
            required
            rows={8}
            className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-erciyes-red transition-all resize-none"
          />
        </div>

        {/* Gönder Butonu */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-erciyes-red text-white text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-60 shadow-lg"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Başlığı Oluştur
          </button>
        </div>
      </form>
    </div>
  );
}
