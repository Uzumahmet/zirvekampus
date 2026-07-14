'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Loader2 } from 'lucide-react';
import YazarKart from '@/components/author/yazar-kart';
import type { YazarProfile } from '@/types';
import { useAuth } from '@/app/providers';

interface Props {
  yazarlar: YazarProfile[];
}

export default function YazarlarListesi({ yazarlar }: Props) {
  const { firebaseUser, isAuthenticated, dbUser } = useAuth();
  const [query, setQuery] = useState('');
  const [myFollowingIds, setMyFollowingIds] = useState<string[]>([]);
  const [loadingFollows, setLoadingFollows] = useState(false);

  // Giriş yapmış kullanıcının kendi takip ettiği kişileri çek
  useEffect(() => {
    if (isAuthenticated && dbUser) {
      const fetchFollowings = async () => {
        setLoadingFollows(true);
        try {
          const headers: Record<string, string> = { Authorization: `Bearer ${firebaseUser?.idToken}` };
          const res = await fetch(`/api/user/connections?username=${dbUser.username}`, { headers });
          if (res.ok) {
            const data = await res.json();
            const ids = (data.following ?? []).map((u: any) => u.id);
            setMyFollowingIds(ids);
          }
        } catch (e) {
          console.error(e);
        } finally {
          setLoadingFollows(false);
        }
      };
      fetchFollowings();
    }
  }, [isAuthenticated, dbUser, firebaseUser]);

  const filtered = useMemo(() => {
    if (!query.trim()) return yazarlar;
    const q = query.toLowerCase().trim();
    return yazarlar.filter(
      (y) =>
        y.username.toLowerCase().includes(q) ||
        (y.display_name ?? '').toLowerCase().includes(q) ||
        (y.bio ?? '').toLowerCase().includes(q)
    );
  }, [yazarlar, query]);

  return (
    <>
      {/* Premium Arama Girişi */}
      <div className="relative max-w-lg mx-auto mb-12">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-muted-foreground" />
        </div>
        <input
          type="search"
          placeholder="Yazar adı veya kullanıcı adı ara..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-erciyes-red/40 focus:border-erciyes-red/40 shadow-sm transition-all duration-300 text-sm"
        />
        {loadingFollows && (
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
            <Loader2 className="h-4 w-4 animate-spin text-erciyes-red" />
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20 text-muted-foreground"
        >
          <p className="text-lg font-medium">Eşleşen kullanıcı bulunamadı</p>
          <p className="text-sm mt-1">Farklı bir arama terimi veya kullanıcı adı deneyin.</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((yazar, index) => (
            <YazarKart
              key={yazar.id}
              yazar={yazar}
              index={index}
              baslangicTakip={myFollowingIds.includes(yazar.id)}
            />
          ))}
        </div>
      )}
    </>
  );
}
