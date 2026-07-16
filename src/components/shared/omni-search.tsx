'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, FileText, MessageSquare, User, Loader2, FolderHeart } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { SearchResult } from '@/types';
import { useDebounce } from '@/hooks/use-debounce';

const TYPE_CONFIG = {
  article: { icon: FileText, label: 'Makale', href: (slug: string) => `/makale/${slug}`, color: 'text-blue-400' },
  forum: { icon: MessageSquare, label: 'Forum', href: (slug: string) => `/forum/${slug}`, color: 'text-emerald-400' },
  user: { icon: User, label: 'Yazar', href: (slug: string) => `/${slug}`, color: 'text-erciyes-gold' },
  collection: { icon: FolderHeart, label: 'Koleksiyon', href: (slug: string) => `/koleksiyon/${slug}`, color: 'text-pink-400' },
};

interface OmniSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function OmniSearch({ isOpen, onClose }: OmniSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const debouncedQuery = useDebounce(query, 300);

  // Açıldığında input'a odaklan
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  // Klavye kısayolu: ⌘K veya Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        isOpen ? onClose() : undefined;
      }
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Debounce'lu arama
  useEffect(() => {
    if (!debouncedQuery.trim() || debouncedQuery.length < 2) {
      setResults([]);
      return;
    }

    const search = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`);
        const data = await res.json();
        setResults(data.results ?? []);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    search();
  }, [debouncedQuery]);

  const handleSelect = (result: SearchResult) => {
    const config = TYPE_CONFIG[result.type];
    router.push(config.href(result.slug));
    onClose();
  };

  // Sonuçları tipine göre gruplandır
  const groupedResults = results.reduce(
    (acc, result) => {
      if (!acc[result.type]) acc[result.type] = [];
      acc[result.type].push(result);
      return acc;
    },
    {} as Record<string, SearchResult[]>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            onClick={onClose}
          />

          {/* Arama Paneli */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2, type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed top-[10vh] left-1/2 -translate-x-1/2 w-full max-w-2xl z-[70] px-4"
          >
            <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
              {/* Input */}
              <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
                {isLoading ? (
                  <Loader2 className="w-5 h-5 text-muted-foreground animate-spin flex-shrink-0" />
                ) : (
                  <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                )}
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Makale, forum, yazar veya koleksiyon ara..."
                  className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-base"
                />
                {query && (
                  <button onClick={() => setQuery('')} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                )}
                <kbd className="hidden sm:block text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded border border-border/50">
                  ESC
                </kbd>
              </div>

              {/* Sonuçlar */}
              <div className="max-h-[60vh] overflow-y-auto">
                {query.length >= 2 && !isLoading && results.length === 0 ? (
                  <div className="py-10 text-center text-muted-foreground text-sm">
                    "<span className="text-foreground">{query}</span>" için sonuç bulunamadı.
                  </div>
                ) : query.length < 2 ? (
                  <div className="py-8 text-center text-muted-foreground text-sm">
                    Aramak için en az 2 karakter girin
                  </div>
                ) : (
                  <div className="p-2">
                    {Object.entries(groupedResults).map(([type, items]) => {
                      const config = TYPE_CONFIG[type as keyof typeof TYPE_CONFIG];
                      const Icon = config.icon;
                      return (
                        <div key={type} className="mb-2">
                          <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {config.label}ler
                          </div>
                          {items.map((result) => (
                            <button
                              key={result.id}
                              onClick={() => handleSelect(result)}
                              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary text-left transition-colors group"
                            >
                              <div className={cn('flex-shrink-0', config.color)}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate group-hover:text-erciyes-red transition-colors">
                                  {result.title}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {result.subtitle}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Alt Yardım Çubuğu */}
              {results.length > 0 && (
                <div className="px-4 py-2 border-t border-border flex items-center gap-4 text-xs text-muted-foreground">
                  <span>↑↓ Navigasyon</span>
                  <span>↵ Seç</span>
                  <span>ESC Kapat</span>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
