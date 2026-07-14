'use client';

/**
 * Firebase İstemci Tarafı Yapılandırması
 * ----------------------------------------
 * Bu dosya yalnızca tarayıcıda çalışır ('use client' direktifi).
 * Firebase Auth SDK'yı başlatır ve Google ile email auth sağlayıcılarını yapılandırır.
 *
 * Kullanım:
 *   import { auth, googleProvider } from '@/lib/firebase/clientApp';
 */

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  type Auth,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Gerekli ortam değişkenlerini doğrula
const requiredEnvVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
] as const;

requiredEnvVars.forEach((envVar) => {
  if (!process.env[envVar]) {
    console.error(
      `[Firebase Client] ${envVar} ortam değişkeni tanımlı değil. ` +
      '.env.local dosyanızı kontrol edin.'
    );
  }
});

/**
 * Firebase App Singleton
 * Next.js Hot Reload'da duplicate app oluşmasını önler.
 */
const app: FirebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

/**
 * Firebase Authentication instance'ı.
 * Giriş/çıkış ve kullanıcı durumu için tüm bileşenlerde kullanılır.
 */
export const auth: Auth = getAuth(app);

/**
 * Google OAuth Sağlayıcısı.
 * Erciyes Üniversitesi hesapları için domain kısıtlaması isteğe bağlı eklenebilir:
 * googleProvider.setCustomParameters({ hd: 'erciyes.edu.tr' });
 */
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');
// Sadece @erciyes.edu.tr hesaplarına izin vermek için aşağıdaki satırı aktive edin:
// googleProvider.setCustomParameters({ hd: 'erciyes.edu.tr' });

export default app;
