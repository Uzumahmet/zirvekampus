'use client';

import { useState, useTransition, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Heart, Users, BookOpen, TrendingUp, Eye, UserPlus, UserMinus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/app/providers';
import type { YazarProfile } from '@/types';

interface YazarKartProps {
  yazar: YazarProfile;
  index: number;
  baslangicTakip?: boolean;
}

const cardVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

export default function YazarKart({ yazar, index, baslangicTakip = false }: YazarKartProps) {
  const { firebaseUser, isAuthenticated, dbUser } = useAuth();
  const [isFollowing, setIsFollowing] = useState(baslangicTakip);
  const [isPending, startTransition] = useTransition();

  const isOwnProfile = dbUser?.id === yazar.id;

  // baslangicTakip prop'u değiştikçe state'i güncelle
  useEffect(() => {
    setIsFollowing(baslangicTakip);
  }, [baslangicTakip]);

  async function handleFollow() {
    if (!isAuthenticated || !firebaseUser) return;
    startTransition(async () => {
      try {
        const idToken = firebaseUser.idToken;
        const res = await fetch('/api/author/follow', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ yazarId: yazar.id }),
        });
        if (res.ok) {
          const json = await res.json();
          setIsFollowing(json.followed);
        }
      } catch {}
    });
  }

  const displayName = yazar.display_name ?? yazar.username;
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
      custom={index}
      className="group relative bg-card border border-border rounded-2xl p-6 hover:border-erciyes-red/40 hover:shadow-card-hover transition-all duration-400 overflow-hidden"
    >
      {/* Arka plan dekor */}
      <div className="absolute inset-0 bg-gradient-to-br from-erciyes-red/3 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      {/* Üst: Avatar + İsim */}
      <div className="flex items-start justify-between mb-5">
        <Link href={`/yazar/${yazar.username}`} className="flex items-center gap-3 group/link">
          {yazar.avatar_url ? (
            <Image
              src={yazar.avatar_url}
              alt={displayName}
              width={56}
              height={56}
              className="rounded-full border-2 border-border group-hover/link:border-erciyes-red transition-colors duration-300 flex-shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-erciyes-red/30 to-red-900/30 flex items-center justify-center border-2 border-border group-hover/link:border-erciyes-red transition-colors duration-300 flex-shrink-0">
              <span className="font-bold text-lg text-erciyes-red">{initials}</span>
            </div>
          )}
          <div>
            <p className="font-semibold text-foreground group-hover/link:text-erciyes-red transition-colors leading-tight">
              {displayName}
            </p>
            <p className="text-xs text-muted-foreground">@{yazar.username}</p>
            {yazar.role === 'editor' && (
              <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-erciyes-gold/15 text-erciyes-gold border border-erciyes-gold/30">
                Editör
              </span>
            )}
            {yazar.role === 'admin' && (
              <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
                Admin
              </span>
            )}
            {yazar.fakulte && (
              <span className="block mt-1.5 text-[10px] text-muted-foreground font-medium truncate max-w-[130px]" title={yazar.fakulte}>
                🏫 {yazar.fakulte}
              </span>
            )}
          </div>
        </Link>

        {/* Takip butonu */}
        {isAuthenticated && !isOwnProfile && (
          <button
            onClick={handleFollow}
            disabled={isPending}
            aria-label={isFollowing ? 'Takibi bırak' : 'Takip et'}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200',
              isPending && 'opacity-50 cursor-wait',
              isFollowing
                ? 'bg-erciyes-red/10 text-erciyes-red border border-erciyes-red/30 hover:bg-erciyes-red hover:text-white'
                : 'bg-secondary text-muted-foreground border border-border hover:bg-erciyes-red hover:text-white hover:border-erciyes-red'
            )}
          >
            {isFollowing ? (
              <><UserMinus className="w-3 h-3" /> Takipteyim</>
            ) : (
              <><UserPlus className="w-3 h-3" /> Takip Et</>
            )}
          </button>
        )}
      </div>

      {/* Biyografi */}
      {yazar.bio && (
        <p className="text-sm text-muted-foreground leading-relaxed mb-5 line-clamp-2">
          {yazar.bio}
        </p>
      )}

      {/* İstatistikler */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <div className="flex flex-col items-center gap-0.5 p-2.5 rounded-xl bg-secondary/50">
          <BookOpen className="w-3.5 h-3.5 text-erciyes-red mb-0.5" />
          <span className="font-bold text-sm">{yazar.makale_sayisi}</span>
          <span className="text-[10px] text-muted-foreground">Makale</span>
        </div>
        <div className="flex flex-col items-center gap-0.5 p-2.5 rounded-xl bg-secondary/50">
          <Users className="w-3.5 h-3.5 text-blue-400 mb-0.5" />
          <span className="font-bold text-sm">{yazar.takipci_sayisi}</span>
          <span className="text-[10px] text-muted-foreground">Takipçi</span>
        </div>
        <div className="flex flex-col items-center gap-0.5 p-2.5 rounded-xl bg-secondary/50">
          <Heart className="w-3.5 h-3.5 text-pink-400 mb-0.5" />
          <span className="font-bold text-sm">{yazar.begeni_sayisi}</span>
          <span className="text-[10px] text-muted-foreground">Beğeni</span>
        </div>
      </div>

      {/* Toplam Okuma */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
        <Eye className="w-3.5 h-3.5" />
        <span>
          <span className="font-medium text-foreground">
            {yazar.toplam_okuma.toLocaleString('tr-TR')}
          </span>{' '}
          toplam okuma
        </span>
      </div>

      {/* Son Makale */}
      {yazar.son_makale && (
        <Link
          href={`/makale/${yazar.son_makale.slug}`}
          className="block p-3 rounded-xl border border-border/50 bg-background/50 hover:border-erciyes-red/30 hover:bg-erciyes-red/3 transition-all duration-200 group/article"
        >
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1">
            <TrendingUp className="w-3 h-3" />
            Son yazı
          </div>
          <p className="text-sm font-medium line-clamp-1 group-hover/article:text-erciyes-red transition-colors">
            {yazar.son_makale.title}
          </p>
        </Link>
      )}
    </motion.div>
  );
}
