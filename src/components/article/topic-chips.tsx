'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ArticleCard from './article-card';
import type { Konu, MakaleWithAuthor } from '@/types';
import { cn } from '@/lib/utils';

interface TopicChipsProps {
  konular: Konu[];
  articles: MakaleWithAuthor[];
}

export default function TopicChips({ konular, articles }: TopicChipsProps) {
  const [activeKonu, setActiveKonu] = useState<number | null>(null);

  const filteredArticles = activeKonu
    ? articles.filter((a) => a.konular.some((k) => k.id === activeKonu))
    : articles;

  return (
    <div>
      {/* Kaydırılabilir Konu Çipleri */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-8 scrollbar-hide">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setActiveKonu(null)}
          className={cn(
            'flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border',
            activeKonu === null
              ? 'bg-erciyes-red text-white border-erciyes-red shadow-glow-red'
              : 'bg-secondary text-muted-foreground border-border hover:border-erciyes-red/50 hover:text-foreground'
          )}
        >
          Tümü
          <span className="ml-1.5 text-xs opacity-70">({articles.length})</span>
        </motion.button>

        {konular.map((konu) => {
          const count = articles.filter((a) => a.konular.some((k) => k.id === konu.id)).length;
          if (count === 0) return null;

          return (
            <motion.button
              key={konu.id}
              whileTap={{ scale: 0.95 }}
              whileHover={{ y: -2 }}
              transition={{ type: 'spring', stiffness: 400 }}
              onClick={() => setActiveKonu(konu.id === activeKonu ? null : konu.id)}
              className={cn(
                'flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border',
                activeKonu === konu.id
                  ? 'bg-erciyes-red text-white border-erciyes-red shadow-glow-red'
                  : 'bg-secondary text-muted-foreground border-border hover:border-erciyes-red/50 hover:text-foreground'
              )}
            >
              {konu.name}
              <span className="ml-1.5 text-xs opacity-70">({count})</span>
            </motion.button>
          );
        })}
      </div>

      {/* Makale Listesi */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeKonu ?? 'all'}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
          className="grid grid-cols-1 gap-5"
        >
          {filteredArticles.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">
              Bu konuda henüz makale yok.
            </div>
          ) : (
            filteredArticles.map((article, index) => (
              <ArticleCard
                key={article.id}
                article={article}
                variant="default"
                index={index}
              />
            ))
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
