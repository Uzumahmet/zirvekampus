'use client';

import { useState, useEffect, useTransition } from 'react';
import { Bookmark, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/app/providers';

interface ForumKaydetButonuProps {
  forumId: string;
}

export default function ForumKaydetButonu({ forumId }: ForumKaydetButonuProps) {
  const { firebaseUser, isAuthenticated, isLoading } = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const checkSaved = async () => {
      if (!isAuthenticated || !firebaseUser) return;
      try {
        const idToken = firebaseUser.idToken;
        const res = await fetch(`/api/forum/save?forumId=${forumId}`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          setIsSaved(data.saved);
        }
      } catch (e) {
        console.error(e);
      }
    };
    checkSaved();
  }, [forumId, isAuthenticated, firebaseUser]);

  const handleSave = () => {
    if (!isAuthenticated || !firebaseUser) return;
    startTransition(async () => {
      try {
        const idToken = firebaseUser.idToken;
        const res = await fetch('/api/forum/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ forumId }),
        });
        if (res.ok) {
          const data = await res.json();
          setIsSaved(data.saved);
        }
      } catch (e) {
        console.error(e);
      }
    });
  };

  if (isLoading || !isAuthenticated) return null;

  return (
    <button
      onClick={handleSave}
      disabled={isPending}
      className={cn(
        'flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-muted-foreground text-xs font-semibold hover:bg-secondary transition-colors',
        isSaved && 'bg-erciyes-red/10 text-erciyes-red border-erciyes-red/30'
      )}
    >
      {isPending ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Bookmark className={cn('w-3.5 h-3.5', isSaved && 'fill-current')} />
      )}
      {isSaved ? 'Kaydedildi' : 'Kaydet'}
    </button>
  );
}
