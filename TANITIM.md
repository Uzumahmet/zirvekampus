# 🎓 Erciyes Kampüs — Blog & Sözlük Platformu | Proje Tanıtım Rehberi

> **Bu dosya, projeyi ilk kez gören veya oturumu yenilenen bir AI'ın sıfırdan kod taraması yapmasını önlemek için oluşturulmuştur. Kodlamaya başlamadan önce bu dosyayı oku.**

---

## 📌 Projenin Tek Cümlelik Özeti
Erciyes Üniversitesi öğrencileri için; **Medium tarzı profesyonel makale okuma** ve **Ekşi Sözlük tarzı anonim/profilli kampüs tartışmaları** sunan, SEO dostu hibrit bir web platformu.

---

## 🏗️ Mimari Kararlar (Kesinleşmiş)

| Katman | Teknoloji | Karar Notu |
|---|---|---|
| **Framework** | Next.js 14+ (App Router) + TypeScript | SSR/ISR ile SEO desteği |
| **Veritabanı** | Supabase (PostgreSQL) | Service Role Key ile sunucu tarafından erişim |
| **Auth** | Firebase Authentication | Google + `@erciyes.edu.tr` mail desteği |
| **Güvenlik Mimarisi** | Next.js API/Server Actions katmanı | Firebase Admin SDK ile token doğrulama → Supabase'e `serviceRoleKey` ile yazma. **Supabase RLS kullanılmıyor, güvenlik Next.js'te.** |
| **Stil** | Tailwind CSS + shadcn/ui + next-themes | Dark mode varsayılan |
| **İkonlar** | Lucide React | — |
| **Metin Editörü** | TipTap (Yazar Paneli) | Zengin metin, HTML/JSON çıktı |
| **AI Servisi** | Google Gemini API (`gemini-2.5-flash`) | Günün özeti için |
| **Animasyon** | Framer Motion + Lenis Smooth Scroll | Scroll-linked + Micro-interactions |
| **Deploy** | Firebase App Hosting | — |

---

## 🎨 Tasarım Sistemi

- **Varsayılan Mod:** Koyu (Dark Mode) — saf siyah değil, Slate/Zinc tonları
- **Arka Plan:** `#0f172a` (slate-900) veya `#09090b` (zinc-950)
- **Vurgu Rengi:** Erciyes Kırmızısı `#b91c1c` — sadece kritik aksiyon noktaları
- **Sıcak Dokunuş:** Sarı-altın tonlar (`#f59e0b`) — ikincil vurgu
- **Tipografi:**
  - UI & Başlıklar: `Inter`
  - Makale Okuma Metni: `Merriweather` veya `Lora` (serif)
- **Responsive:** Mobile-First. Mobilde dikey akış + hamburger menü. Masaüstünde `70%` makale / `30%` forum sidebarlı split layout.

---

## 🗃️ Veritabanı Şema Özeti (Supabase)

| Tablo | Amaç | Kritik Kolon |
|---|---|---|
| `kullanicilar` | Firebase UID ile eşleşen profil tablosu | `id VARCHAR(128)` = Firebase UID |
| `konular` | Makale kategorileri (Yazılım, Kampüs…) | `slug` |
| `makaleler` | Blog yazıları, TipTap içerikli | `status`: draft / published / archived |
| `makale_konulari` | Çoktan çoka ilişki tablosu | FK: makale_id + konu_id |
| `forum_basliklari` | Sözlük başlıkları (benzersiz) | `slug` |
| `forum_entryleri` | Her başlık altındaki entryler | `is_anonymous BOOLEAN` |
| `yazar_basvurulari` | Yazarlık başvuruları | `status`: pending / approved / rejected |

**Rol Sistemi:** `anonim` → `kullanici` → `yazar` → `editor` → `admin`

---

## 📁 Klasör Yapısı Özeti

```
src/
├── app/
│   ├── (auth)/                 → giris-yap, kayit-ol
│   ├── (dashboard)/            → yazar-paneli, editor-paneli (rol korumalı)
│   ├── makale/[slug]/          → Makale okuma sayfası (ISR)
│   ├── forum/[topic-slug]/     → Sözlük başlık sayfası (SSR)
│   ├── yazar/[username]/       → Yazar profili (SSR)
│   ├── basvuru/                → Yazarlık başvuru formu
│   └── api/
│       ├── ai-summary/         → Gemini API özet route'u
│       └── search/             → Supabase Full-Text Search route'u
├── components/
│   ├── ui/                     → shadcn/ui bileşenleri
│   ├── layout/                 → Navbar, Sidebar, Footer
│   ├── shared/                 → OmniSearch, AiSummaryCard, ThemeToggle
│   ├── article/                → ArticleCard, TopicChips, TipTapEditor
│   └── forum/                  → TopicList, EntryCard, EntryForm
├── lib/
│   ├── supabase/               → client.ts (tarayıcı) + server.ts (servis key)
│   └── firebase/               → clientApp.ts (auth) + admin.ts (token doğrulama)
├── hooks/                      → use-auth.ts, use-debounce.ts
└── types/                      → database.types.ts, index.ts
```

---

## ✨ Animasyon & UX Stratejisi

1. **`framer-motion`** — Sayfa geçişleri, makale kartlarının scroll ile `fade-in-up` giriş animasyonları, hamburger menü açılış efekti, konu çiplerinin `spring` bounce animasyonu.
2. **`@studio-freight/lenis`** — Tüm sayfada pürüzsüz ("butter-smooth") scroll deneyimi. `layout.tsx`'te global olarak başlatılır.
3. **Okuma Progress Bar** — Makale okuma sayfasında `framer-motion`'ın `useScroll` + `useTransform` kancaları ile üstte ince kırmızı ilerleme çubuğu.
4. **`canvas-confetti`** — Yazar başvurusu onaylandığında ve ilk makale yayınlandığında kutlama efekti.
5. **Backdrop Blur** — OmniSearch açıldığında sayfanın geri kalanı `backdrop-blur` + karartma overlay alır.

---

## 🔑 Ortam Değişkenleri (`.env.local`)

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # Sadece sunucu tarafında kullanılır!

# Firebase (Client - Public)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase (Admin - Sunucu)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=               # JSON formatında, \n karakterleri korunmalı

# Google Gemini AI
GEMINI_API_KEY=                     # Sadece sunucu tarafında kullanılır!
```

---

## 🚦 Geliştirme Durumu (Kodlama Aşamaları)

| Adım | Kapsam | Durum |
|---|---|---|
| **0 — Mimari Plan** | Şema + Klasör Yapısı | ✅ Tamamlandı |
| **1 — Altyapı** | package.json, .env, lib/ bağlantıları, TANITIM.md | ✅ Tamamlandı |
| **2 — Layout & Tasarım Sistemi** | globals.css, Navbar, Footer, ThemeProvider, Lenis | ✅ Tamamlandı |
| **3 — Anasayfa** | AI Özeti, Makale Akışı, Forum Sidebar | ✅ Tamamlandı |
| **4 — Makaleler Modülü** | Liste + Konu Çipleri + Makale Okuma Sayfası | ✅ Tamamlandı |
| **5 — Forum Modülü** | Başlıklar + Entry Sistemi + Anonim Destek | ✅ Tamamlandı |
| **6 — Auth & Roller** | Giriş/Kayıt, Rol Korumalı Sayfalar | ✅ Tamamlandı |
| **7 — Yazar Paneli** | TipTap Editör + Yayınlama + Taslak | ⏳ Bekliyor |
| **8 — Editör Paneli** | Başvuru İnceleme + Onay/Red | ⏳ Bekliyor |
| **9 — OmniSearch** | Supabase Full-Text Search API + Dropdown UI | ⏳ Bekliyor |
| **10 — Deploy** | Firebase App Hosting yapılandırması | ✅ Tamamlandı |

---

## 📝 Kodlama Kuralları ve Standartlar

1. **Tüm bileşenler TypeScript ile yazılır.** `any` tipi kesinlikle kullanılmaz.
2. **Server Component öncelikli yaklaşım:** Mümkün olan her yerde `'use client'` yerine Server Component tercih edilir.
3. **Supabase'e hiçbir zaman client tarafından doğrudan erişilmez.** Tüm Supabase işlemleri Server Actions veya API Route'ları üzerinden yapılır.
4. **Firebase token doğrulaması zorunludur:** Korumalı API route'larına gelen isteklerde `Authorization: Bearer <token>` header'ı `Firebase Admin SDK` ile doğrulanır.
5. **Slug üretimi:** Her makale ve forum başlığında Türkçe karakter desteği olan bir `slugify` yardımcı fonksiyonu kullanılır.
6. **Animasyonlar kullanıcıyı yormamalıdır:** `prefers-reduced-motion` medya sorgusu her animasyon bileşeninde dikkate alınır.
