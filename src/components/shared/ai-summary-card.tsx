'use client';

import { motion } from 'framer-motion';
import { Bot, Sparkles, RefreshCw, ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface AiSummaryCardProps {
  initialSummary?: string;
}

export default function AiSummaryCard({ initialSummary }: AiSummaryCardProps) {
  const [summary, setSummary] = useState(initialSummary ?? '');
  const [isLoading, setIsLoading] = useState(!initialSummary);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [displayText, setDisplayText] = useState('');

  // Typewriter efekti
  useEffect(() => {
    if (!summary) return;
    setDisplayText('');
    let i = 0;
    const interval = setInterval(() => {
      if (i < summary.length) {
        setDisplayText(summary.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 20);
    return () => clearInterval(interval);
  }, [summary]);

  // İlk yüklemede özet çek
  useEffect(() => {
    if (!initialSummary) fetchSummary();
  }, []);

  const fetchSummary = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/ai-summary');
      const data = await res.json();
      setSummary(data.summary ?? '');
    } catch {
      setSummary('Günün özeti şu an yüklenemiyor. Lütfen daha sonra tekrar deneyin.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchSummary();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-2xl border border-erciyes-red/20 bg-gradient-to-br from-erciyes-red/5 via-card to-card p-6 shadow-glow-red/10"
    >
      {/* Dekoratif Arka Plan */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-erciyes-red/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-erciyes-gold/5 rounded-full blur-2xl pointer-events-none" />

      {/* Başlık */}
      <div className="relative flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-erciyes-red/10 border border-erciyes-red/20 flex items-center justify-center">
            <Bot className="w-4 h-4 text-erciyes-red" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-foreground">Günün AI Özeti</h2>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Gemini 2.5 Flash tarafından oluşturuldu
            </p>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isLoading || isRefreshing}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
          aria-label="Özeti yenile"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', isRefreshing && 'animate-spin')} />
        </button>
      </div>

      {/* Özet Metni */}
      <div className="relative min-h-[80px]">
        {isLoading ? (
          <div className="space-y-2">
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-5/6" />
            <div className="skeleton h-4 w-4/6" />
          </div>
        ) : (
          <p className="text-sm text-foreground/90 leading-relaxed">
            {displayText}
            {displayText.length < summary.length && (
              <span className="animate-pulse text-erciyes-red">|</span>
            )}
          </p>
        )}
      </div>

      {/* Alt Link */}
      {!isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-4 pt-4 border-t border-border/50"
        >
          <Link
            href="/makale"
            className="flex items-center gap-1.5 text-xs font-medium text-erciyes-red hover:text-erciyes-red/80 transition-colors group"
          >
            Tüm güncel makaleleri gör
            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>
      )}

      {/* Kırmızı Sol Kenar Çizgisi */}
      <div className="absolute left-0 top-6 bottom-6 w-0.5 bg-gradient-to-b from-transparent via-erciyes-red to-transparent rounded-full" />
    </motion.div>
  );
}
