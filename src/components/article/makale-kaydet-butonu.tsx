'use client';

import { useState, useTransition, useEffect } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/app/providers';
import Link from 'next/link';

interface MakaleKaydetButonuProps {
  makaleId: string;
  className?: string;
}

/**
 * Makale Kaydet / Kaydet Butonu
 * ─────────────────────────────
 * Makale okuma sayfasında gösterilir.
 * Giriş yapmamış kullanıcıları giriş sayfasına yönlendirir.
 */
export default function MakaleKaydetButonu({ makaleId, className }: MakaleKaydetButonuProps) {
  const { firebaseUser, isAuthenticated, isLoading } = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  // İlk yüklemede kayıt durumunu kontrol et
  useEffect(() => {
    if (!isAuthenticated || !firebaseUser) return;

    const idToken = firebaseUser.idToken;
    fetch(`/api/article/save?makaleId=${makaleId}`, {
      headers: { Authorization: `Bearer ${idToken}` },
    })
      .then((res) => res.json())
      .then((data: { saved: boolean }) => setIsSaved(data.saved))
      .catch(() => {});
  }, [isAuthenticated, firebaseUser, makaleId]);

  if (isLoading) return null;

  if (!isAuthenticated) {
    return (
      <Link
        href="/giris-yap"
        title="Kaydetmek için giriş yapın"
        className={cn(
          'flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-muted-foreground text-sm hover:bg-secondary transition-colors',
          className
        )}
      >
        <Bookmark className="w-4 h-4" />
        <span className="hidden sm:inline">Kaydet</span>
      </Link>
    );
  }

  function handleSave() {
    if (!firebaseUser) return;
    startTransition(async () => {
      try {
        const idToken = firebaseUser!.idToken;
        const res = await fetch('/api/article/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({ makaleId }),
        });
        if (res.ok) {
          const json = await res.json() as { saved: boolean };
          setIsSaved(json.saved);
        }
      } catch {}
    });
  }

  return (
    <button
      onClick={handleSave}
      disabled={isPending}
      title={isSaved ? 'Kaydedildi — Kaldırmak için tıklayın' : 'Makaleyi kaydet'}
      aria-label={isSaved ? 'Kaydı kaldır' : 'Makaleyi kaydet'}
      className={cn(
        'flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-all duration-200 disabled:opacity-50',
        isSaved
          ? 'bg-erciyes-red/10 text-erciyes-red border-erciyes-red/30 hover:bg-erciyes-red/20'
          : 'border-border text-muted-foreground hover:bg-secondary',
        className
      )}
    >
      {isSaved ? (
        <BookmarkCheck className="w-4 h-4 fill-erciyes-red" />
      ) : (
        <Bookmark className="w-4 h-4" />
      )}
      <span className="hidden sm:inline">{isSaved ? 'Kaydedildi' : 'Kaydet'}</span>
    </button>
  );
}
