'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { formatRelativeTime } from '@/lib/utils';
import type { ForumEntryWithAuthor } from '@/types';

interface EntryListProps {
  entries: ForumEntryWithAuthor[];
}

export default function EntryList({ entries }: EntryListProps) {
  if (entries.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        <p className="text-lg mb-1">Henüz entry yok.</p>
        <p className="text-sm">İlk entry'i sen yaz!</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {entries.map((entry, index) => (
        <motion.div
          key={entry.id}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-20px' }}
          transition={{ delay: Math.min(index * 0.04, 0.3), duration: 0.4 }}
          className="group py-5 border-b border-border/50 last:border-0"
        >
          {/* Entry Numarası + İçerik */}
          <div className="flex gap-4">
            {/* Numara */}
            <span className="flex-shrink-0 text-xs text-muted-foreground/50 font-mono mt-1 w-6 text-right">
              {index + 1}
            </span>

            <div className="flex-1 min-w-0">
              {/* Entry Metni */}
              <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                {entry.content}
              </p>

              {/* Entry Meta */}
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  {entry.is_anonymous ? (
                    <span className="text-xs text-muted-foreground italic">anonim</span>
                  ) : entry.author ? (
                    <Link
                      href={`/yazar/${entry.author.username}`}
                      className="flex items-center gap-1.5 group/author"
                    >
                      {entry.author.avatar_url ? (
                        <Image
                          src={entry.author.avatar_url}
                          alt={entry.author.display_name ?? ''}
                          width={20}
                          height={20}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-erciyes-red/20 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-erciyes-red">
                            {(entry.author.display_name ?? 'A')[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                      <span className="text-xs text-muted-foreground group-hover/author:text-erciyes-red transition-colors">
                        {entry.author.username}
                      </span>
                    </Link>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">silinmiş kullanıcı</span>
                  )}
                </div>

                <span className="text-xs text-muted-foreground/60">
                  {formatRelativeTime(entry.created_at)}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
