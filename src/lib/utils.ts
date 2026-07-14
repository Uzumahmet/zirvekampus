/**
 * Yardımcı Fonksiyonlar (Utilities)
 * -----------------------------------
 * Uygulama genelinde kullanılan genel amaçlı araç fonksiyonları.
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import slugifyLib from 'slugify';

// ─── Tailwind Sınıf Birleştirici ────────────────────────────────────────────

/**
 * shadcn/ui bileşenlerinde standart kullanım.
 * clsx ile koşullu sınıfları birleştirir, tailwind-merge ile
 * çakışan Tailwind sınıflarını akıllıca çözer.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Türkçe Slug Üreteci ────────────────────────────────────────────────────

/**
 * Türkçe karakter destekli slug üretici.
 * ğ→g, ü→u, ş→s, ı→i, ö→o, ç→c dönüşümlerini yapar.
 */
export function createSlug(text: string): string {
  return slugifyLib(text, {
    lower: true,
    strict: true,
    locale: 'tr',
    trim: true,
  });
}

// ─── Tarih Formatlayıcıları ─────────────────────────────────────────────────

/**
 * Tarih/saat string'ini Türkçe görece zaman formatına dönüştürür.
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Az önce';
  if (diffMins < 60) return `${diffMins} dakika önce`;
  if (diffHours < 24) return `${diffHours} saat önce`;
  if (diffDays < 7) return `${diffDays} gün önce`;

  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/**
 * Tarih/saat string'ini tam Türkçe tarih formatına dönüştürür.
 */
export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateString));
}

// ─── Okuma Süresi Hesaplayıcı ───────────────────────────────────────────────

/**
 * Makale içeriğinden tahmini okuma süresini hesaplar.
 * Ortalama okuma hızı: 200 kelime/dakika.
 */
export function calculateReadingTime(content: string): string {
  const plainText = content.replace(/<[^>]*>/g, '');
  const wordCount = plainText.trim().split(/\s+/).length;
  const minutes = Math.ceil(wordCount / 200);
  return `${minutes} dk okuma`;
}

// ─── Metin Kısaltıcı ────────────────────────────────────────────────────────

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '...';
}

// ─── API Güvenlik Yardımcısı ─────────────────────────────────────────────────

/**
 * HTTP isteğinden Bearer token'ı çıkarır.
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.split('Bearer ')[1];
  return token?.trim() || null;
}
