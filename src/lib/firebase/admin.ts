/**
 * Firebase Admin SDK — Sunucu Tarafı Yapılandırması
 * --------------------------------------------------
 * Bu dosya SADECE sunucu ortamında (API Routes, Server Actions) çalışır.
 * Asla 'use client' bileşenlerine import edilmemelidir.
 *
 * Birincil görevi: Kullanıcıdan gelen Firebase ID Token'ını doğrulamak
 * ve içindeki kullanıcı bilgilerini (uid, email, rol) güvenle çıkarmak.
 *
 * Kullanım:
 *   import { verifyFirebaseToken } from '@/lib/firebase/admin';
 *   const decodedToken = await verifyFirebaseToken(token);
 */

import { App, getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth, DecodedIdToken } from 'firebase-admin/auth';

/**
 * Firebase Admin App Singleton
 * Sunucu tarafında her istekte yeniden başlatmayı önler.
 */
function initializeFirebaseAdmin(): App {
  const apps = getApps();
  if (apps.length > 0) {
    return apps[0]!;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      '[Firebase Admin] FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL veya ' +
      'FIREBASE_PRIVATE_KEY ortam değişkeni tanımlı değil. .env.local dosyanızı kontrol edin.'
    );
  }

  let cleanedKey = privateKey.trim();
  
  // Strip trailing comma if present (e.g. from copy-pasting JSON)
  if (cleanedKey.endsWith(',')) {
    cleanedKey = cleanedKey.slice(0, -1).trim();
  }
  
  // Eğer başında ve sonunda çift/tek tırnak varsa kaldır
  if (cleanedKey.startsWith('"') && cleanedKey.endsWith('"')) {
    cleanedKey = cleanedKey.slice(1, -1);
  }
  if (cleanedKey.startsWith("'") && cleanedKey.endsWith("'")) {
    cleanedKey = cleanedKey.slice(1, -1);
  }
  
  // \\n kaçış metinlerini gerçek yeni satır karakterine dönüştür
  const formattedKey = cleanedKey.replace(/\\n/g, '\n').trim();

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey: formattedKey,
    }),
  });
}

// Admin app'i başlat
const adminApp = initializeFirebaseAdmin();

/**
 * Gelen HTTP isteğindeki Firebase ID Token'ını doğrular.
 *
 * @param token - İstemciden gelen Firebase ID Token (Bearer token)
 * @returns Doğrulanmış token içindeki kullanıcı bilgileri (uid, email, vb.)
 * @throws Token geçersiz veya süresi dolmuşsa hata fırlatır
 */
export async function verifyFirebaseToken(token: string): Promise<DecodedIdToken> {
  return getAuth(adminApp).verifyIdToken(token);
}

/**
 * Firebase UID'ye göre kullanıcı bilgisini Firebase'den getirir.
 *
 * @param uid - Firebase UID
 */
export async function getFirebaseUser(uid: string) {
  return getAuth(adminApp).getUser(uid);
}

export const adminAuth = getAuth(adminApp);

export { adminApp };
