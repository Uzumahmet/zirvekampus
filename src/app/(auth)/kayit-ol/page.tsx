'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase/clientApp';
import { UserPlus, Mail, Lock, User, Eye, EyeOff, Chrome, AlertCircle, Loader2 } from 'lucide-react';

export default function KayitOlPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleRegister = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      await signInWithPopup(auth, googleProvider);
      router.push('/');
    } catch {
      setError('Google ile kayıt başarısız. Lütfen tekrar deneyin.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(user, { displayName });
      router.push('/');
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === 'auth/email-already-in-use') {
        setError('Bu e-posta ile zaten bir hesap mevcut.');
      } else if (code === 'auth/invalid-email') {
        setError('Geçersiz e-posta adresi.');
      } else if (code === 'auth/weak-password') {
        setError('Şifre çok zayıf. Daha güçlü bir şifre seç.');
      } else {
        setError('Kayıt olunamadı. Lütfen tekrar deneyin.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-erciyes-red/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-erciyes-gold/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-erciyes-red to-red-900 flex items-center justify-center">
                <span className="text-white font-black">E</span>
              </div>
            </Link>
            <h1 className="text-2xl font-bold mb-2">Hesap Oluştur</h1>
            <p className="text-muted-foreground text-sm">Erciyes Kampüs topluluğuna katıl</p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </motion.div>
          )}

          <button
            onClick={handleGoogleRegister}
            disabled={googleLoading || isLoading}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-sm font-medium transition-all duration-200 disabled:opacity-60 mb-6"
          >
            {googleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Chrome className="w-4 h-4" />}
            Google ile Kayıt Ol
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">veya</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={handleEmailRegister} className="flex flex-col gap-4">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Adın ve soyadın"
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-secondary border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-erciyes-red focus:ring-1 focus:ring-erciyes-red/30 transition-all"
              />
            </div>

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-posta adresin"
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-secondary border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-erciyes-red focus:ring-1 focus:ring-erciyes-red/30 transition-all"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Şifren (min. 6 karakter)"
                required
                className="w-full pl-10 pr-10 py-3 rounded-xl bg-secondary border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-erciyes-red focus:ring-1 focus:ring-erciyes-red/30 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading || googleLoading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-erciyes-red text-white text-sm font-semibold hover:bg-red-800 transition-colors duration-200 disabled:opacity-60 mt-1"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              Kayıt Ol
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Zaten hesabın var mı?{' '}
            <Link href="/giris-yap" className="text-erciyes-red hover:text-erciyes-red/80 font-medium transition-colors">
              Giriş Yap
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
