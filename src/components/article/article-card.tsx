'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { Clock, Eye, ArrowRight, Bookmark, TrendingUp } from 'lucide-react';
import { formatRelativeTime, calculateReadingTime, cn } from '@/lib/utils';
import type { MakaleWithAuthor } from '@/types';

interface ArticleCardProps {
  article: MakaleWithAuthor;
  variant?: 'default' | 'featured' | 'compact';
  index?: number;
}

const fadeInUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.08,
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
};

export default function ArticleCard({ article, variant = 'default', index = 0 }: ArticleCardProps) {
  const readingTime = calculateReadingTime(article.content);

  if (variant === 'featured') {
    return (
      <motion.article
        variants={fadeInUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-50px' }}
        custom={index}
        className="group relative overflow-hidden rounded-2xl border border-border bg-card hover:border-erciyes-red/30 transition-all duration-500 hover:shadow-card-hover"
      >
        <Link href={`/makale/${article.slug}`}>
          {/* Kapak Görseli */}
          {article.cover_image && (
            <div className="relative h-56 w-full overflow-hidden">
              <Image
                src={article.cover_image}
                alt={article.title}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
              
              {/* Konu Etiketi */}
              {article.konular[0] && (
                <span className="absolute top-4 left-4 px-2.5 py-1 rounded-full text-xs font-semibold bg-erciyes-red text-white">
                  {article.konular[0].name}
                </span>
              )}

              {/* Trending Badge */}
              {article.views_count > 500 && (
                <span className="absolute top-4 right-4 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-erciyes-gold/90 text-black">
                  <TrendingUp className="w-3 h-3" /> Trend
                </span>
              )}
            </div>
          )}

          {/* İçerik */}
          <div className="p-5">
            <h2 className="font-bold text-lg leading-snug text-foreground group-hover:text-erciyes-red transition-colors duration-200 line-clamp-2 mb-2">
              {article.title}
            </h2>
            {article.excerpt && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
                {article.excerpt}
              </p>
            )}

            {/* Meta */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {article.author?.avatar_url ? (
                  <Image
                    src={article.author.avatar_url}
                    alt={article.author.display_name ?? ''}
                    width={28}
                    height={28}
                    className="rounded-full border border-border"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-erciyes-red/20 flex items-center justify-center">
                    <span className="text-xs font-bold text-erciyes-red">
                      {(article.author?.display_name ?? 'A')[0].toUpperCase()}
                    </span>
                  </div>
                )}
                <span className="text-xs text-muted-foreground font-medium">
                  {article.author?.display_name ?? 'Anonim'}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {readingTime}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {article.views_count.toLocaleString('tr-TR')}
                </span>
              </div>
            </div>
          </div>
        </Link>
      </motion.article>
    );
  }

  if (variant === 'compact') {
    return (
      <motion.article
        variants={fadeInUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-30px' }}
        custom={index}
        className="group flex items-start gap-4 py-4 border-b border-border last:border-0 hover:bg-secondary/30 rounded-lg px-2 -mx-2 transition-colors duration-200"
      >
        <Link href={`/makale/${article.slug}`} className="flex gap-4 w-full">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {article.konular[0] && (
                <span className="text-xs font-medium text-erciyes-red">
                  {article.konular[0].name}
                </span>
              )}
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">{formatRelativeTime(article.created_at)}</span>
            </div>
            <h3 className="font-semibold text-sm text-foreground group-hover:text-erciyes-red transition-colors line-clamp-2">
              {article.title}
            </h3>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
              <span>{article.author?.display_name ?? 'Anonim'}</span>
              <span className="flex items-center gap-0.5">
                <Eye className="w-3 h-3" /> {article.views_count}
              </span>
            </div>
          </div>

          {article.cover_image && (
            <div className="relative w-20 h-16 flex-shrink-0 rounded-lg overflow-hidden">
              <Image
                src={article.cover_image}
                alt={article.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-110"
              />
            </div>
          )}
        </Link>
      </motion.article>
    );
  }

  // Default variant
  return (
    <motion.article
      variants={fadeInUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-50px' }}
      custom={index}
      className="group relative overflow-hidden rounded-xl border border-border bg-card hover:border-erciyes-red/20 transition-all duration-400 hover:shadow-md"
    >
      <Link href={`/makale/${article.slug}`} className="flex flex-col sm:flex-row gap-0">
        {article.cover_image && (
          <div className="relative h-48 sm:h-auto sm:w-48 flex-shrink-0 overflow-hidden">
            <Image
              src={article.cover_image}
              alt={article.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        )}
        <div className={cn('p-5 flex flex-col justify-between flex-1', !article.cover_image && 'w-full')}>
          {article.konular[0] && (
            <span className="text-xs font-semibold text-erciyes-red mb-2 inline-block">
              {article.konular[0].name}
            </span>
          )}
          <h3 className="font-bold text-foreground group-hover:text-erciyes-red transition-colors duration-200 line-clamp-2 leading-snug mb-2">
            {article.title}
          </h3>
          {article.excerpt && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
              {article.excerpt}
            </p>
          )}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium">{article.author?.display_name ?? 'Anonim'}</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{readingTime}</span>
              <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{article.views_count}</span>
              <span>{formatRelativeTime(article.created_at)}</span>
            </div>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
