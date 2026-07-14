# Erciyes Kampüs - Blog & Sözlük Platformu - Master Blueprint

Bu döküman, Erciyes Üniversitesi öğrencileri için tasarlanan hibrit Blog ve Sözlük platformunun veritabanı şemasını, klasör yapısını ve modern arayüz animasyon/tema stratejisini detaylandırmaktadır.

---

## 1. Supabase PostgreSQL Veritabanı Şeması

Kullanıcı yönetimi Firebase Authentication ile yapılacağından, `kullanicilar` tablosundaki `id` kolonu Firebase'den dönen `uid` (string) değeriyle eşleşecektir. Firebase Auth tetiklendiğinde veya ilk girişte kullanıcı kaydı buraya yazılır.

```sql
-- 1. UZANTILAR (EXTENSIONS) VE TANIMLAR
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Rol Tipleri için ENUM (İsteğe bağlı veya CHECK constraint ile yapılabilir)
-- Roller: 'anonim', 'kullanici', 'yazar', 'editor', 'admin'

-- 2. KULLANICILAR TABLOSU (Firebase UID ile senkronize)
CREATE TABLE kullanicilar (
    id VARCHAR(128) PRIMARY KEY, -- Firebase Auth UID (String)
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    avatar_url TEXT,
    role VARCHAR(20) NOT NULL DEFAULT 'kullanici' 
        CONSTRAINT chk_role CHECK (role IN ('anonim', 'kullanici', 'yazar', 'editor', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Row Level Security (RLS) Etkinleştirme
ALTER TABLE kullanicilar ENABLE ROW LEVEL SECURITY;

-- 3. KONULAR TABLOSU (Makale kategorileri)
CREATE TABLE konular (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    slug VARCHAR(60) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- RLS Etkinleştirme
ALTER TABLE konular ENABLE ROW LEVEL SECURITY;

-- 4. MAKALELER TABLOSU
CREATE TABLE makaleler (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    content TEXT NOT NULL, -- Rich-text (TipTap HTML/JSON)
    excerpt VARCHAR(500), -- Kartlarda gösterilecek kısa özet
    cover_image TEXT, -- Kapak fotoğrafı URL
    author_id VARCHAR(128) REFERENCES kullanicilar(id) ON DELETE SET NULL,
    views_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CONSTRAINT chk_status CHECK (status IN ('draft', 'published', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE makaleler ENABLE ROW LEVEL SECURITY;

-- 5. MAKALE - KONU İLİŞKİSİ TABLOSU (Çoktan Çoka İlişki)
CREATE TABLE makale_konulari (
    makale_id UUID REFERENCES makaleler(id) ON DELETE CASCADE,
    konu_id INTEGER REFERENCES konular(id) ON DELETE CASCADE,
    PRIMARY KEY (makale_id, konu_id)
);

-- 6. FORUM BAŞLIKLARI TABLOSU (Sözlük Başlıkları)
CREATE TABLE forum_basliklari (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) UNIQUE NOT NULL, -- Benzersiz konu başlığı (örn: "28 haziran 2026 erü yemek listesi")
    slug VARCHAR(255) UNIQUE NOT NULL,
    created_by VARCHAR(128) REFERENCES kullanicilar(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE forum_basliklari ENABLE ROW LEVEL SECURITY;

-- 7. FORUM ENTRYLERİ TABLOSU (Yorumlar / Entryler)
CREATE TABLE forum_entryleri (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID REFERENCES forum_basliklari(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author_id VARCHAR(128) REFERENCES kullanicilar(id) ON DELETE SET NULL,
    is_anonymous BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE forum_entryleri ENABLE ROW LEVEL SECURITY;

-- 8. YAZAR BAŞVURULARI TABLOSU
CREATE TABLE yazar_basvurulari (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(128) REFERENCES kullanicilar(id) ON DELETE CASCADE UNIQUE, -- Her kullanıcı sadece bir kez başvurabilir
    reason TEXT NOT NULL,
    sample_writing TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CONSTRAINT chk_app_status CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewer_id VARCHAR(128) REFERENCES kullanicilar(id) ON DELETE SET NULL,
    review_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE yazar_basvurulari ENABLE ROW LEVEL SECURITY;
```

### Full-Text Search (Omni-Search) Altyapısı
Supabase üzerinde üç tabloda tek sorguyla arama yapmak için postgres fonksiyonu ve `tsvector` indeksleme:

```sql
-- Makaleler için tsvector indeksleme
CREATE INDEX IF NOT EXISTS idx_makaleler_search ON makaleler 
USING gin(to_tsvector('turkish', title));

-- Forum Başlıkları için tsvector indeksleme
CREATE INDEX IF NOT EXISTS idx_forum_basliklari_search ON forum_basliklari 
USING gin(to_tsvector('turkish', title));

-- Kullanıcılar için tsvector indeksleme
CREATE INDEX IF NOT EXISTS idx_kullanicilar_search ON kullanicilar 
USING gin(to_tsvector('turkish', username || ' ' || COALESCE(display_name, '')));

-- Tek sorguda her şeyi arayabilmek için Postgres Stored Procedure
CREATE OR REPLACE FUNCTION omni_search(search_query TEXT)
RETURNS TABLE (
    id TEXT,
    title TEXT,
    type TEXT, -- 'article', 'forum', 'user'
    slug TEXT,
    subtitle TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    -- 1. Makaleler
    SELECT 
        m.id::text,
        m.title,
        'article'::text AS type,
        m.slug,
        u.display_name::text AS subtitle
    FROM makaleler m
    LEFT JOIN kullanicilar u ON m.author_id = u.id
    WHERE to_tsvector('turkish', m.title) @@ plainto_tsquery('turkish', search_query) AND m.status = 'published'
    
    UNION ALL
    
    -- 2. Forum Başlıkları
    SELECT 
        fb.id::text,
        fb.title,
        'forum'::text AS type,
        fb.slug,
        (SELECT COUNT(*)::text || ' entry' FROM forum_entryleri fe WHERE fe.topic_id = fb.id) AS subtitle
    FROM forum_basliklari fb
    WHERE to_tsvector('turkish', fb.title) @@ plainto_tsquery('turkish', search_query)
    
    UNION ALL
    
    -- 3. Yazarlar/Kullanıcılar
    SELECT 
        k.id::text,
        k.display_name AS title,
        'user'::text AS type,
        k.username AS slug,
        ('@' || k.username)::text AS subtitle
    FROM kullanicilar k
    WHERE to_tsvector('turkish', k.username || ' ' || COALESCE(k.display_name, '')) @@ plainto_tsquery('turkish', search_query)
    
    LIMIT 15;
END;
$$;
```

---

## 2. Next.js App Router Klasör Yapısı (File Tree)

```
Erüatical/
├── public/
│   ├── assets/
│   │   ├── logo-light.svg
│   │   └── logo-dark.svg
│   └── fonts/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── giris-yap/
│   │   │   │   └── page.tsx
│   │   │   └── kayit-ol/
│   │   │       └── page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── yazar-paneli/
│   │   │   │   ├── yeni-yazi/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── taslaklar/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── page.tsx
│   │   │   └── editor-paneli/
│   │   │       ├── başvurular/
│   │   │       │   └── page.tsx
│   │   │       └── page.tsx
│   │   ├── makale/
│   │   │   ├── [slug]/
│   │   │   │   └── page.tsx
│   │   │   └── page.tsx
│   │   ├── forum/
│   │   │   ├── [topic-slug]/
│   │   │   │   └── page.tsx
│   │   │   └── page.tsx
│   │   ├── yazar/
│   │   │   └── [username]/
│   │   │       └── page.tsx
│   │   ├── basvuru/
│   │   │   └── page.tsx
│   │   ├── api/
│   │   │   ├── ai-summary/
│   │   │   │   └── route.ts
│   │   │   └── search/
│   │   │       └── route.ts
│   │   ├── favicon.ico
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── providers.tsx
│   ├── components/
│   │   ├── ui/                 # Shadcn/ui bileşenleri
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   └── input.tsx
│   │   ├── layout/
│   │   │   ├── navbar.tsx
│   │   │   ├── sidebar-forum.tsx
│   │   │   ├── hamburger-menu.tsx
│   │   │   └── footer.tsx
│   │   ├── shared/
│   │   │   ├── omni-search.tsx
│   │   │   ├── ai-summary-card.tsx
│   │   │   └── theme-toggle.tsx
│   │   ├── article/
│   │   │   ├── article-card.tsx
│   │   │   ├── topic-chips.tsx
│   │   │   └── editor-tiptap.tsx
│   │   └── forum/
│   │       ├── entry-card.tsx
│   │       ├── entry-form.tsx
│   │       └── topic-list.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   └── server.ts
│   │   ├── firebase/
│   │   │   ├── clientApp.ts
│   │   │   └── admin.ts
│   │   └── utils.ts
│   ├── hooks/
│   │   ├── use-auth.ts
│   │   └── use-debounce.ts
│   ├── types/
│   │   ├── database.types.ts
│   │   └── index.ts
│   └── styles/
│       └── globals.css
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── next.config.ts
```

---

## 3. Kurulacak Paketler ve Animasyon/Tasarım Stratejisi

Kullanıcıyı içine çeken, göz yormayan ve etkileşimi artıran akıcı animasyonlar için kullanılacak araçlar ve strateji:

### A. Gerekli Paketler (Dependencies)

1. **Temel Kütüphaneler:**
   - `lucide-react` (İkon kütüphanesi)
   - `@tiptap/react` `@tiptap/starter-kit` (Metin editörü)
   - `next-themes` (Dark/Light mode yönetimi)
   - `clsx` `tailwind-merge` (Shadcn/ui için sınıf birleştiriciler)

2. **Animasyon ve Smooth Scroll Paketleri:**
   - `framer-motion`: Sayfa geçişleri, dinamik liste elemanları, kahraman (hero) kartı mikro animasyonları ve mobil hamburger menü açılış efektleri için.
   - `@studio-freight/lenis`: Sayfada gezinirken sert tarayıcı kaydırmasını ortadan kaldıran, "butter-smooth" (yağ gibi akan) kaydırma motoru.
   - `canvas-confetti` (ve `@types/canvas-confetti`): Yazar başvurusu kabul edildiğinde veya ilk makale başarıyla yayınlandığında ekranda kutlama animasyonu yapmak için.

### B. Tasarım ve Animasyon Stratejisi (Sürükleyici Deneyim)

* **Göz Yormayan Koyu Tema:** Koyu gri slate/zinc tonları (`#0f172a` veya `#09090b`) arka plan olarak seçilerek tamamen saf siyahtan kaçınılacak. Vurgular için **Erciyes Kırmızısı** (`#b91c1c`) sadece kritik butonlarda ve aktif linklerde asil bir dokunuş olarak kullanılacak.
* **Scroll-Linked Animations (Kaydırma Etkileşimleri):** Framer Motion'ın `useScroll` ve `useTransform` kancaları kullanılarak, makale okunurken en üstte akıcı bir okuma ilerleme çubuğu (reading progress bar) yer alacak. Makale kartları ve forum entry'leri ekran sınırına girdikçe hafifçe yukarı doğru kayarak ve opaklığı artarak belirecek (`fade-in-up`).
* **Hover Micro-Interactions (Mikro Etkileşimler):** Konu çipleri (chips) üzerine gelindiğinde minik bir esneme (`spring` animasyonu) yapacak. Omni-Search açıldığında arka plan yumuşak bir cam bulanıklığı (backdrop-blur) alacak.
* **TipTap ve Yazma Deneyimi:** Yazar paneli odak moduna (Focus Mode) sahip olacak; yazmaya başlandığında yan menüler yavaşça sönerek yazarı metinle baş başa bırakacak.

---

## 4. Açık Sorular ve Kararlar

> [!NOTE]
> 1. **Firebase ve Supabase Entegrasyonu:** Firebase Auth JWT token'ını Supabase'e göndererek Supabase tarafında RLS kurallarını Firebase UID'lerine göre mi doğrulayacağız? (Önerilen yöntem: Supabase Custom Claims / Custom JWT verification).
> 2. **AI Servisi:** Günün AI özeti için hangi LLM API'ını (Edge functions aracılığıyla Google Gemini Developer API mı?) entegre edeceğiz?
