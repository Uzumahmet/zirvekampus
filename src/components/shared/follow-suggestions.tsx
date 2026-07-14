'use client';

import { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/app/providers';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { Users, UserPlus, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SuggestedUser {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  fakulte: string | null;
  follower_count: number;
}

export default function FollowSuggestions() {
  const { firebaseUser, isAuthenticated, dbUser } = useAuth();
  const { t } = useTranslation();
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const headers: Record<string, string> = {};
        if (firebaseUser) {
          headers['Authorization'] = `Bearer ${firebaseUser.idToken}`;
        }
        const res = await fetch('/api/user/suggestions', { headers });
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [firebaseUser, isAuthenticated]);

  const handleFollowToggle = async (userId: string) => {
    if (!isAuthenticated || !firebaseUser) {
      window.location.href = '/giris-yap';
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/author/follow', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${firebaseUser.idToken}`,
          },
          body: JSON.stringify({ yazarId: userId }),
        });

        if (res.ok) {
          const json = await res.json();
          setFollowingMap((prev) => ({
            ...prev,
            [userId]: json.followed,
          }));
        }
      } catch (e) {
        console.error(e);
      }
    });
  };

  if (loading) {
    return (
      <div className="p-6 bg-card border border-border rounded-2xl flex items-center justify-center min-h-[200px]">
        <Loader2 className="w-6 h-6 animate-spin text-erciyes-red" />
      </div>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="p-6 bg-card border border-border rounded-2xl">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-4 h-4 text-erciyes-red" />
        <h3 className="font-bold text-base text-foreground">
          {t('suggestions.title')}
        </h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4 leading-normal">
        {t('suggestions.sub')}
      </p>

      <div className="space-y-4">
        {suggestions.map((user) => {
          const isFollowing = followingMap[user.id] ?? false;
          const shownName = user.display_name ?? user.username;

          // Kendimizi önermeyelim
          if (dbUser && dbUser.id === user.id) return null;

          return (
            <div key={user.id} className="flex items-center justify-between gap-3 text-sm">
              <Link href={`/yazar/${user.username}`} className="flex items-center gap-2.5 flex-1 min-w-0 group">
                {user.avatar_url ? (
                  <div className="relative w-9 h-9 rounded-full overflow-hidden flex-shrink-0 border border-border">
                    <Image
                      src={user.avatar_url}
                      alt={shownName}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center font-bold text-muted-foreground flex-shrink-0 border border-border uppercase">
                    {shownName.slice(0, 2)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate group-hover:text-erciyes-red transition-colors leading-tight">
                    {shownName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.fakulte ? user.fakulte : `@${user.username}`}
                  </p>
                </div>
              </Link>

              <button
                onClick={() => handleFollowToggle(user.id)}
                disabled={isPending}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all',
                  isFollowing
                    ? 'bg-secondary text-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 border border-border'
                    : 'bg-erciyes-red text-white hover:bg-red-800 shadow-sm'
                )}
              >
                {isFollowing ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    {t('suggestions.following')}
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    {t('suggestions.follow')}
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
