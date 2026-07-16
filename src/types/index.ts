/**
 * Uygulama Genel Tip Tanımları
 * --------------------------------
 * Veritabanı tiplerine ek olarak UI, Auth ve yardımcı tipler burada tanımlanır.
 */

import type { Database, UserRole } from './database.types';

// ─── Tablo Satır Tipleri (Kısayol) ─────────────────────────────────────────

export type Kullanici = Database['public']['Tables']['kullanicilar']['Row'];
export type Konu = Database['public']['Tables']['konular']['Row'];
export type Makale = Database['public']['Tables']['makaleler']['Row'];
export type ForumBaslik = Database['public']['Tables']['forum_basliklari']['Row'];
export type ForumEntry = Database['public']['Tables']['forum_entryleri']['Row'];
export type YazarBasvuru = Database['public']['Tables']['yazar_basvurulari']['Row'];
export type YazarTakip = Database['public']['Tables']['yazar_takip']['Row'];
export type YazarBegeni = Database['public']['Tables']['yazar_begeni']['Row'];
export type KaydedilenMakale = Database['public']['Tables']['kaydedilen_makaleler']['Row'];
export type YazarKonu = Database['public']['Tables']['yazar_konulari']['Row'];
export type Koleksiyon = Database['public']['Tables']['koleksiyonlar']['Row'];
export type KoleksiyonOgesi = Database['public']['Tables']['koleksiyon_ogeleri']['Row'];
export type KaydedilenForum = Database['public']['Tables']['kaydedilen_forumlar']['Row'];

// ─── Birleşik (Join) Tipler ─────────────────────────────────────────────────

/** Makale kartında gösterilecek veriler (yazar bilgisi dahil) */
export type MakaleWithAuthor = Makale & {
  author: Pick<Kullanici, 'username' | 'display_name' | 'avatar_url' | 'fakulte'> | null;
  konular: Konu[];
};

/** Yazarlar listesi için genişletilmiş yazar profil tipi */
export type YazarProfile = Kullanici & {
  makale_sayisi: number;
  takipci_sayisi: number;
  begeni_sayisi: number;
  toplam_okuma: number;
  son_makale: Pick<Makale, 'title' | 'slug' | 'created_at'> | null;
};

/** Forum başlığı + entry sayısı */
export type ForumBaslikWithCount = ForumBaslik & {
  entry_count: number;
  creator: Pick<Kullanici, 'username' | 'display_name'> | null;
};

/** Forum entry + yazar bilgisi */
export type ForumEntryWithAuthor = ForumEntry & {
  author: Pick<Kullanici, 'username' | 'display_name' | 'avatar_url'> | null;
};

// ─── Auth Tipleri ────────────────────────────────────────────────────────────

/** Uygulama genelinde kullanılan auth context tipi */
export type AuthUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  /** Firebase ID Token — API isteklerinde kullanılır */
  idToken: string;
};

/** Veritabanındaki kullanıcı profilini içeren tam auth durumu */
export type AuthState = {
  firebaseUser: AuthUser | null;
  dbUser: (Kullanici & { topics?: number[]; allow_mentions?: boolean }) | null;
  isLoading: boolean;
  isAuthenticated: boolean;
};

// ─── Omni-Search Tipleri ─────────────────────────────────────────────────────

export type SearchResultType = 'article' | 'forum' | 'user' | 'collection';

export type SearchResult = {
  id: string;
  title: string;
  type: SearchResultType;
  slug: string;
  subtitle: string;
};

export type SearchResponse = {
  results: SearchResult[];
  query: string;
};

// ─── API Response Tipleri ────────────────────────────────────────────────────

export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiError = {
  success: false;
  error: string;
  code?: string;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ─── Rol Yetki Kontrolü ──────────────────────────────────────────────────────

/** Rol hiyerarşisi (soldan sağa artan yetki seviyesi) */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  anonim: 0,
  kullanici: 1,
  yazar: 2,
  editor: 3,
  admin: 4,
};

/**
 * Kullanıcının belirtilen minimum role sahip olup olmadığını kontrol eder.
 * @example hasMinimumRole('yazar', 'editor') → false
 * @example hasMinimumRole('admin', 'editor') → true
 */
export function hasMinimumRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

// ─── Proje Tipleri ────────────────────────────────────────────────────────────

export type Proje = {
  id: string;
  title: string;
  description: string;
  image_urls: string[];
  author_id: string;
  fakulte: string | null;
  views_count: number;
  likes_count: number;
  created_at: string;
  updated_at: string;
};

export type ProjeWithAuthor = Proje & {
  author: Pick<Kullanici, 'username' | 'display_name' | 'avatar_url' | 'fakulte'> | null;
  liked_by_me?: boolean;
  comment_count?: number;
};

export type ProjeYorum = {
  id: string;
  project_id: string;
  author_id: string | null;
  content: string;
  created_at: string;
};

export type ProjeYorumWithAuthor = ProjeYorum & {
  author: Pick<Kullanici, 'username' | 'display_name' | 'avatar_url'> | null;
};

// ─── Re-exports ──────────────────────────────────────────────────────────────

export type { UserRole, ArticleStatus, ApplicationStatus } from './database.types';
