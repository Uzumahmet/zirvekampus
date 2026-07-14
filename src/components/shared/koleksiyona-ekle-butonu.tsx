'use client';

import { useState, useTransition, useEffect } from 'react';
import { FolderHeart, Plus, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/app/providers';
import Link from 'next/link';

interface KoleksiyonaEkleButonuProps {
  itemId: string;
  itemType: 'article' | 'forum';
  className?: string;
}

export default function KoleksiyonaEkleButonu({ itemId, itemType, className }: KoleksiyonaEkleButonuProps) {
  const { firebaseUser, isAuthenticated, isLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [cols, setCols] = useState<any[]>([]);
  const [colsLoading, setColsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Koleksiyonları çek
  const fetchCollections = async () => {
    if (!firebaseUser) return;
    setColsLoading(true);
    try {
      const idToken = firebaseUser.idToken;
      // Kullanıcının kendi koleksiyon verilerini getir
      const res = await fetch(`/api/user/saved?username=${firebaseUser.displayName || 'me'}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCols(data.koleksiyonlar || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setColsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCollections();
    }
  }, [isOpen]);

  if (isLoading) return null;

  if (!isAuthenticated) {
    return (
      <Link
        href="/giris-yap"
        title="Koleksiyona eklemek için giriş yapın"
        className={cn(
          'flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-muted-foreground text-xs font-semibold hover:bg-secondary transition-colors',
          className
        )}
      >
        <FolderHeart className="w-3.5 h-3.5" />
        Koleksiyona Ekle
      </Link>
    );
  }

  // Öğe koleksiyonda var mı kontrolü
  const hasItem = (col: any) => {
    return col.ogeler?.some((oge: any) => oge.oge_id === itemId);
  };

  // Ekleme / Çıkarma işlemi
  const handleToggleItem = async (colId: string, isAdded: boolean) => {
    startTransition(async () => {
      try {
        const idToken = firebaseUser!.idToken;
        const res = await fetch('/api/collection/item', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({
            collectionId: colId,
            itemId,
            itemType,
            action: isAdded ? 'remove' : 'add',
          }),
        });

        if (res.ok) {
          // Listeyi yenile
          fetchCollections();
        }
      } catch (e) {
        console.error(e);
      }
    });
  };

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-muted-foreground text-xs font-semibold hover:bg-secondary transition-colors',
          isOpen && 'bg-secondary text-foreground',
          className
        )}
      >
        <FolderHeart className="w-3.5 h-3.5 text-erciyes-red" />
        Koleksiyona Ekle
      </button>

      {isOpen && (
        <>
          {/* Overlay to close */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          
          <div className="absolute right-0 mt-2 w-60 rounded-xl bg-card border border-border p-3 shadow-xl z-50 space-y-3">
            <div className="flex items-center justify-between text-xs border-b border-border pb-2">
              <span className="font-bold uppercase tracking-wider text-muted-foreground">Koleksiyonlarım</span>
              {colsLoading && <Loader2 className="w-3 h-3 animate-spin text-erciyes-red" />}
            </div>

            {colsLoading && cols.length === 0 ? (
              <p className="text-[10px] text-muted-foreground text-center py-4">Koleksiyonlar yükleniyor...</p>
            ) : cols.length === 0 ? (
              <div className="text-center py-4 space-y-2">
                <p className="text-[10px] text-muted-foreground">Koleksiyonunuz bulunmuyor.</p>
                <Link
                  href={`/yazar/${firebaseUser?.displayName}`}
                  className="inline-block text-[10px] font-bold text-erciyes-red hover:underline"
                >
                  Profilinden oluştur +
                </Link>
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1.5">
                {cols.map((col) => {
                  const added = hasItem(col);
                  return (
                    <button
                      key={col.id}
                      onClick={() => handleToggleItem(col.id, added)}
                      disabled={isPending}
                      className={cn(
                        'w-full flex items-center justify-between p-2 rounded-lg text-xs hover:bg-secondary transition-colors text-left',
                        added && 'bg-erciyes-red/5 text-erciyes-red font-semibold'
                      )}
                    >
                      <span className="truncate pr-2">{col.name}</span>
                      {added ? <Check className="w-3.5 h-3.5 flex-shrink-0" /> : <Plus className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
