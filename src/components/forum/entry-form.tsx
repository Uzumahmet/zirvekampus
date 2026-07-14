'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Send, EyeOff, Loader2, LogIn } from 'lucide-react';
import { useAuth } from '@/app/providers';
import Link from 'next/link';

interface EntryFormProps {
  topicId: string;
}

export default function EntryForm({ topicId }: EntryFormProps) {
  const { isAuthenticated, firebaseUser } = useAuth();
  const router = useRouter();
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isAuthenticated || !firebaseUser) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <p className="text-sm text-muted-foreground">Entry yazmak için giriş yapman gerekiyor.</p>
        <Link
          href="/giris-yap"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-erciyes-red text-white text-sm font-medium hover:bg-red-800 transition-colors"
        >
          <LogIn className="w-4 h-4" />
          Giriş Yap
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim().length < 5) {
      setError('Entry en az 5 karakter olmalıdır.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const token = firebaseUser.idToken;
      const res = await fetch('/api/forum/entry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          topicId,
          content: content.trim(),
          isAnonymous,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Entry gönderilemedi');
      }

      setContent('');
      router.refresh(); // Sayfayı yenile
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="font-semibold text-sm">Entry Yaz</h3>

      {/* Metin Alanı */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Buraya düşüncelerini yaz..."
        rows={4}
        className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-erciyes-red focus:ring-1 focus:ring-erciyes-red/30 resize-none transition-all font-reading"
      />

      {/* Karakter Sayısı */}
      <div className="flex items-center justify-between">
        <span className={`text-xs ${content.length > 2000 ? 'text-destructive' : 'text-muted-foreground'}`}>
          {content.length} / 2000
        </span>
      </div>

      {/* Hata */}
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {/* Alt Bar */}
      <div className="flex items-center justify-between">
        {/* Anonim Toggle */}
        <button
          type="button"
          onClick={() => setIsAnonymous(!isAnonymous)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
            isAnonymous
              ? 'bg-erciyes-gold/20 text-erciyes-gold border border-erciyes-gold/30'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent'
          }`}
        >
          <EyeOff className="w-3.5 h-3.5" />
          {isAnonymous ? 'Anonim yazılıyor' : 'Anonim yaz'}
        </button>

        {/* Gönder */}
        <motion.button
          type="submit"
          disabled={isLoading || content.length < 5 || content.length > 2000}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-erciyes-red text-white text-sm font-medium hover:bg-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Gönder
        </motion.button>
      </div>
    </form>
  );
}
