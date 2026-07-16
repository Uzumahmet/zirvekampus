/**
 * Veritabanı Tip Tanımları
 * -------------------------
 * Bu dosya Supabase'deki tablo yapısını TypeScript tiplerine dönüştürür.
 * Supabase CLI ile otomatik üretmek için: `npx supabase gen types typescript --local > src/types/database.types.ts`
 * Şimdilik manuel olarak tanımlanmıştır.
 */

export type UserRole = 'anonim' | 'kullanici' | 'yazar' | 'editor' | 'admin';
export type ArticleStatus = 'draft' | 'published' | 'archived';
export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface Database {
  public: {
    Tables: {
      kullanicilar: {
        Row: {
          id: string; // Firebase UID
          email: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          role: UserRole;
          onboarded: boolean;
          fakulte: string | null;
          fakulte_gizli: boolean;
          base_email: string | null;
          school_email: string | null;
          phone_number: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          username: string;
          display_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          role?: UserRole;
          onboarded?: boolean;
          fakulte?: string | null;
          fakulte_gizli?: boolean;
          base_email?: string | null;
          school_email?: string | null;
          phone_number?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email?: string;
          username?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          role?: UserRole;
          onboarded?: boolean;
          fakulte?: string | null;
          fakulte_gizli?: boolean;
          base_email?: string | null;
          school_email?: string | null;
          phone_number?: string | null;
          updated_at?: string;
        };
      };

      yazar_konulari: {
        Row: {
          yazar_id: string;
          konu_id: number;
        };
        Insert: {
          yazar_id: string;
          konu_id: number;
        };
        Update: {
          yazar_id?: string;
          konu_id?: number;
        };
      };

      yazar_takip: {
        Row: {
          takipci_id: string;
          yazar_id: string;
          created_at: string;
        };
        Insert: {
          takipci_id: string;
          yazar_id: string;
          created_at?: string;
        };
        Update: {
          takipci_id?: string;
          yazar_id?: string;
        };
      };

      yazar_begeni: {
        Row: {
          kullanici_id: string;
          yazar_id: string;
          created_at: string;
        };
        Insert: {
          kullanici_id: string;
          yazar_id: string;
          created_at?: string;
        };
        Update: {
          kullanici_id?: string;
          yazar_id?: string;
        };
      };

      kaydedilen_makaleler: {
        Row: {
          kullanici_id: string;
          makale_id: string;
          created_at: string;
        };
        Insert: {
          kullanici_id: string;
          makale_id: string;
          created_at?: string;
        };
        Update: {
          kullanici_id?: string;
          makale_id?: string;
        };
      };

      konular: {
        Row: {
          id: number;
          name: string;
          slug: string;
          created_at: string;
        };
        Insert: {
          name: string;
          slug: string;
          created_at?: string;
        };
        Update: {
          name?: string;
          slug?: string;
        };
      };

      makaleler: {
        Row: {
          id: string; // UUID
          title: string;
          slug: string;
          content: string;
          excerpt: string | null;
          cover_image: string | null;
          author_id: string | null;
          views_count: number;
          status: ArticleStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          slug: string;
          content: string;
          excerpt?: string | null;
          cover_image?: string | null;
          author_id?: string | null;
          views_count?: number;
          status?: ArticleStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          slug?: string;
          content?: string;
          excerpt?: string | null;
          cover_image?: string | null;
          author_id?: string | null;
          views_count?: number;
          status?: ArticleStatus;
          updated_at?: string;
        };
      };

      makale_konulari: {
        Row: {
          makale_id: string;
          konu_id: number;
        };
        Insert: {
          makale_id: string;
          konu_id: number;
        };
        Update: {
          makale_id?: string;
          konu_id?: number;
        };
      };

      forum_basliklari: {
        Row: {
          id: string; // UUID
          title: string;
          slug: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          slug: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          title?: string;
          slug?: string;
          created_by?: string | null;
        };
      };

      forum_entryleri: {
        Row: {
          id: string; // UUID
          topic_id: string;
          content: string;
          author_id: string | null;
          is_anonymous: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          topic_id: string;
          content: string;
          author_id?: string | null;
          is_anonymous?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          content?: string;
          is_anonymous?: boolean;
          updated_at?: string;
        };
      };

      yazar_basvurulari: {
        Row: {
          id: string; // UUID
          user_id: string;
          reason: string;
          sample_writing: string;
          status: ApplicationStatus;
          reviewer_id: string | null;
          review_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          reason: string;
          sample_writing: string;
          status?: ApplicationStatus;
          reviewer_id?: string | null;
          review_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          reason?: string;
          sample_writing?: string;
          status?: ApplicationStatus;
          reviewer_id?: string | null;
          review_notes?: string | null;
          updated_at?: string;
        };
      };

      koleksiyonlar: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          is_public: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          is_public?: boolean;
          created_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          is_public?: boolean;
        };
      };

      koleksiyon_ogeleri: {
        Row: {
          koleksiyon_id: string;
          oge_id: string;
          oge_tipi: 'article' | 'forum';
          created_at: string;
        };
        Insert: {
          koleksiyon_id: string;
          oge_id: string;
          oge_tipi: 'article' | 'forum';
          created_at?: string;
        };
        Update: {
          koleksiyon_id?: string;
          oge_id?: string;
          oge_tipi?: 'article' | 'forum';
        };
      };

      kaydedilen_forumlar: {
        Row: {
          kullanici_id: string;
          forum_id: string;
          created_at: string;
        };
        Insert: {
          kullanici_id: string;
          forum_id: string;
          created_at?: string;
        };
        Update: {
          kullanici_id?: string;
          forum_id?: string;
        };
      };

      clubs: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          logo_url: string | null;
          vision: string | null;
          founder_id: string | null;
          president_id: string | null;
          created_at: string;
          updated_at: string;
          president_appointed_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          logo_url?: string | null;
          vision?: string | null;
          founder_id?: string | null;
          president_id?: string | null;
          created_at?: string;
          updated_at?: string;
          president_appointed_at?: string;
        };
        Update: {
          name?: string;
          slug?: string;
          description?: string | null;
          logo_url?: string | null;
          vision?: string | null;
          founder_id?: string | null;
          president_id?: string | null;
          updated_at?: string;
          president_appointed_at?: string;
        };
      };

      club_members: {
        Row: {
          id: string;
          club_id: string;
          user_id: string;
          role: string;
          team_name: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          user_id: string;
          role?: string;
          team_name?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          club_id?: string;
          user_id?: string;
          role?: string;
          team_name?: string | null;
          status?: string;
          updated_at?: string;
        };
      };

      club_projects: {
        Row: {
          id: string;
          club_id: string;
          title: string;
          description: string | null;
          image_urls: string[];
          status: string;
          leader_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          title: string;
          description?: string | null;
          image_urls?: string[];
          status?: string;
          leader_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          club_id?: string;
          title?: string;
          description?: string | null;
          image_urls?: string[];
          status?: string;
          leader_id?: string | null;
          updated_at?: string;
        };
      };

      club_events: {
        Row: {
          id: string;
          club_id: string;
          title: string;
          description: string | null;
          location: string | null;
          event_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          title: string;
          description?: string | null;
          location?: string | null;
          event_date: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          club_id?: string;
          title?: string;
          description?: string | null;
          location?: string | null;
          event_date?: string;
          updated_at?: string;
        };
      };

      club_event_rsvps: {
        Row: {
          id: string;
          event_id: string;
          user_id: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          user_id: string;
          status?: string;
          created_at?: string;
        };
        Update: {
          event_id?: string;
          user_id?: string;
          status?: string;
        };
      };

      club_recruitments: {
        Row: {
          id: string;
          club_id: string;
          title: string;
          description: string;
          requirements: string[];
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          title: string;
          description: string;
          requirements?: string[];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          club_id?: string;
          title?: string;
          description?: string;
          requirements?: string[];
          is_active?: boolean;
          updated_at?: string;
        };
      };

      club_recruitment_applications: {
        Row: {
          id: string;
          recruitment_id: string;
          user_id: string;
          cover_letter: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          recruitment_id: string;
          user_id: string;
          cover_letter?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          recruitment_id?: string;
          user_id?: string;
          cover_letter?: string | null;
          status?: string;
          updated_at?: string;
        };
      };

      club_handovers: {
        Row: {
          id: string;
          club_id: string;
          candidate_id: string;
          status: string;
          created_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          candidate_id: string;
          status?: string;
          created_at?: string;
          expires_at: string;
        };
        Update: {
          club_id?: string;
          candidate_id?: string;
          status?: string;
          expires_at?: string;
        };
      };

      club_handover_approvals: {
        Row: {
          id: string;
          handover_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          handover_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          handover_id?: string;
          user_id?: string;
        };
      };

      club_violations: {
        Row: {
          id: string;
          club_id: string;
          reporter_id: string;
          description: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          reporter_id: string;
          description: string;
          created_at?: string;
        };
        Update: {
          club_id?: string;
          reporter_id?: string;
          description?: string;
        };
      };
    };

    Functions: {
      omni_search: {
        Args: { search_query: string };
        Returns: {
          id: string;
          title: string;
          type: 'article' | 'forum' | 'user';
          slug: string;
          subtitle: string;
        }[];
      };
    };
  };
}
