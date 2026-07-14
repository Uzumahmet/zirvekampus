import Link from 'next/link';
import { formatRelativeTime, cn } from '@/lib/utils';
import { MessageSquare, ArrowRight, TrendingUp } from 'lucide-react';

interface ForumTopic {
  id: string;
  title: string;
  slug: string;
  created_at: string;
  entry_count: number;
  creator: { username: string; display_name: string | null } | null;
}

interface ForumSidebarProps {
  topics: ForumTopic[];
  compact?: boolean;
}

export default function ForumSidebar({ topics, compact = false }: ForumSidebarProps) {
  return (
    <div className={cn('rounded-xl border border-border bg-card overflow-hidden', compact && 'bg-transparent border-0')}>
      {!compact && (
        <div className="px-4 py-3 border-b border-border bg-secondary/30">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">En aktif konular</p>
            <Link
              href="/forum"
              className="flex items-center gap-1 text-xs text-erciyes-red hover:text-erciyes-red/80 font-medium transition-colors group"
            >
              Tümü
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      )}

      <div className={cn('divide-y divide-border', compact && 'divide-border/50')}>
        {topics.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            Henüz forum konusu yok.
          </div>
        ) : (
          topics.map((topic, index) => (
            <Link
              key={topic.id}
              href={`/forum/${topic.slug}`}
              className="flex items-start gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors group"
            >
              {/* Sıra Numarası */}
              <span
                className={cn(
                  'flex-shrink-0 w-5 h-5 rounded text-xs font-bold flex items-center justify-center mt-0.5',
                  index === 0
                    ? 'bg-erciyes-red text-white'
                    : index === 1
                    ? 'bg-erciyes-red/70 text-white'
                    : index === 2
                    ? 'bg-erciyes-red/40 text-erciyes-red'
                    : 'bg-secondary text-muted-foreground'
                )}
              >
                {index + 1}
              </span>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground group-hover:text-erciyes-red transition-colors line-clamp-2 leading-snug">
                  {topic.title}
                </p>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    {typeof topic.entry_count === 'number'
                      ? topic.entry_count
                      : (topic.entry_count as any)?.[0]?.count ?? 0}{' '}
                    entry
                  </span>
                  <span>·</span>
                  <span>{formatRelativeTime(topic.created_at)}</span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {!compact && (
        <div className="px-4 py-3 border-t border-border">
          <Link
            href="/forum/yeni"
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium border border-erciyes-red/30 text-erciyes-red hover:bg-erciyes-red hover:text-white transition-all duration-200"
          >
            + Yeni Başlık Aç
          </Link>
        </div>
      )}
    </div>
  );
}
