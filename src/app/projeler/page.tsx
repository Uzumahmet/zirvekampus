'use client';

import { useState, useEffect, useTransition, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/app/providers';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { useSearchParams, useRouter } from 'next/navigation';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase/clientApp';
import MentionTextarea from '@/components/shared/mention-textarea';
import {
  FolderCode, Plus, Search, GraduationCap, X, Heart, MessageSquare, Eye, Calendar, Sparkles, Loader2, Link2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProjeWithAuthor } from '@/types';

const ERU_FAKULTELERI = [
  'Mühendislik Fakültesi',
  'Tıp Fakültesi',
  'Eczacılık Fakültesi',
  'Diş Hekimliği Fakültesi',
  'Mimarlık Fakültesi',
  'Fen Fakültesi',
  'Edebiyat Fakültesi',
  'İktisadi ve İdari Bilimler Fakültesi',
  'İlahiyat Fakültesi',
  'İletişim Fakültesi',
  'Hukuk Fakültesi',
  'Eğitim Fakültesi',
  'Sağlık Bilimleri Fakültesi',
  'Spor Bilimleri Fakültesi',
  'Turizm Fakültesi',
  'Veteriner Fakültesi',
  'Ziraat Fakültesi',
  'Havacılık ve Uzay Bilimleri Fakültesi'
];

function ProjelerPageContent() {
  const { firebaseUser, isAuthenticated, dbUser } = useAuth();
  const { t, language } = useTranslation();
  const [isPending, startTransition] = useTransition();
  const searchParams = useSearchParams();

  // Akış Eyaletleri
  const [projects, setProjects] = useState<ProjeWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState('');

  // Modal Eyaletleri
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newFaculty, setNewFaculty] = useState('');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadProgress, setImageUploadProgress] = useState<number | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (firebaseUser) {
        headers['Authorization'] = `Bearer ${firebaseUser.idToken}`;
      }
      
      let url = '/api/projects?limit=30';
      if (selectedFaculty) url += `&fakulte=${encodeURIComponent(selectedFaculty)}`;
      if (query.trim()) url += `&q=${encodeURIComponent(query.trim())}`;

      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [firebaseUser, selectedFaculty, query]);

  const router = useRouter();

  useEffect(() => {
    if (searchParams.get('yeni') === 'true' && isAuthenticated) {
      setShowModal(true);
      // URL'den ?yeni=true parametresini temizle (geri gelince tekrar açmasın)
      router.replace('/projeler', { scroll: false });
    }
  }, [searchParams, isAuthenticated]);


  const handleProjectImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !firebaseUser) return;

    const file = files[0];
    if (file.size > 5 * 1024 * 1024) {
      setModalError('Dosya boyutu 5MB\'dan küçük olmalıdır.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setModalError('Lütfen geçerli bir resim dosyası seçin.');
      return;
    }

    setImageUploading(true);
    setImageUploadProgress(0);
    setModalError(null);

    const fileExtension = file.name.split('.').pop() || 'png';
    const filePath = `uploads/${firebaseUser.uid}/project_${Date.now()}.${fileExtension}`;
    const storageRef = ref(storage, filePath);
    const metadata = { contentType: file.type };
    const uploadTask = uploadBytesResumable(storageRef, file, metadata);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setImageUploadProgress(progress);
      },
      (error) => {
        console.error('Proje resmi yükleme hatası:', error);
        setModalError('Görsel yüklenemedi: ' + error.message);
        setImageUploading(false);
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          setUploadedImages((prev) => [...prev, downloadUrl]);
        } catch (err: any) {
          setModalError('Bağlantı adresi alınamadı.');
        } finally {
          setImageUploading(false);
          setImageUploadProgress(null);
        }
      }
    );
  };

  // Proje Beğenme (Akıştan)
  const handleLike = async (projectId: string, e: React.MouseEvent) => {
    e.preventDefault(); // Detay sayfasına gitmeyi engelle
    if (!isAuthenticated || !firebaseUser) {
      window.location.href = '/giris-yap';
      return;
    }

    try {
      const res = await fetch(`/api/projects/${projectId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${firebaseUser.idToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setProjects((prev) =>
          prev.map((proj) =>
            proj.id === projectId
              ? {
                  ...proj,
                  liked_by_me: data.liked,
                  likes_count: data.likes_count,
                }
              : proj
          )
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Yeni Proje Yayınlama
  const handleSubmitProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!newTitle.trim() || !newDesc.trim()) {
      setModalError('Başlık ve açıklama alanları zorunludur.');
      return;
    }

    if (!newFaculty) {
      setModalError('Lütfen projenin ilgili olduğu fakülteyi seçin.');
      return;
    }

    if (uploadedImages.length === 0) {
      setModalError('Lütfen en az 1 görsel yükleyin.');
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/projects', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${firebaseUser!.idToken}`,
          },
          body: JSON.stringify({
            title: newTitle,
            description: newDesc,
            fakulte: newFaculty,
            imageUrls: uploadedImages,
          }),
        });

        if (res.ok) {
          setShowModal(false);
          setNewTitle('');
          setNewDesc('');
          setNewFaculty('');
          setUploadedImages([]);
          fetchProjects(); // Yenile
        } else {
          const data = await res.json();
          setModalError(data.error || 'Proje paylaşılamadı.');
        }
      } catch (err) {
        setModalError('Sunucu bağlantısı kurulamadı.');
      }
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Üst Başlık ve Aksiyon */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-border pb-8 mb-10 text-center sm:text-left">
        <div>
          <div className="flex items-center gap-3 justify-center sm:justify-start mb-2">
            <div className="p-2.5 rounded-xl bg-erciyes-red/10 border border-erciyes-red/20">
              <FolderCode className="w-6 h-6 text-erciyes-red" />
            </div>
            <h1 className="text-3xl font-black tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              {t('projects.title')}
            </h1>
          </div>
          <p className="text-muted-foreground text-sm max-w-xl leading-relaxed">
            {t('projects.subtitle')}
          </p>
        </div>

        {isAuthenticated && (
          <button
            onClick={() => {
              setShowModal(true);
              setModalError(null);
            }}
            className="flex items-center gap-2 px-5 py-3 rounded-full bg-erciyes-red text-white hover:bg-red-800 transition-colors font-bold text-sm shadow-lg shadow-erciyes-red/10"
          >
            <Plus className="w-4 h-4" />
            {t('projects.newProject')}
          </button>
        )}
      </div>

      {/* Arama & Fakülte Filtreleri */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-8 max-w-4xl mx-auto">
        <div className="relative flex-1 w-full">
          <Search className="absolute inset-y-0 left-3.5 my-auto w-4.5 h-4.5 text-muted-foreground" />
          <input
            type="text"
            placeholder={t('explore.searchPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-2xl bg-card border border-border text-sm focus:outline-none focus:border-erciyes-red transition-all"
          />
        </div>

        <div className="relative w-full md:w-72">
          <GraduationCap className="absolute inset-y-0 left-3.5 my-auto w-4.5 h-4.5 text-muted-foreground" />
          <select
            value={selectedFaculty}
            onChange={(e) => setSelectedFaculty(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-2xl bg-card border border-border text-sm focus:outline-none focus:border-erciyes-red transition-all appearance-none cursor-pointer"
          >
            <option value="">{t('explore.allFaculties')}</option>
            {ERU_FAKULTELERI.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Akış Listesi */}
      {loading ? (
        <div className="py-20 flex justify-center items-center">
          <Loader2 className="w-8 h-8 animate-spin text-erciyes-red" />
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border rounded-3xl max-w-lg mx-auto">
          <FolderCode className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="font-semibold text-foreground">{t('home.noProjects')}</p>
          <p className="text-xs text-muted-foreground mt-1">Farklı bir fakülte seçmeyi veya arama yapmayı deneyin.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {projects.map((project) => {
            const authorName = project.author?.display_name ?? project.author?.username ?? 'Öğrenci';
            const mainImage = project.image_urls?.[0] || '/assets/logo-dark.svg';

            return (
              <Link
                key={project.id}
                href={`/projeler/${project.id}`}
                className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col group"
              >
                {/* Görsel Kapak (Instagram tarzı) */}
                <div className="relative aspect-[4/3] bg-secondary overflow-hidden">
                  <Image
                    src={mainImage}
                    alt={project.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3 bg-background/80 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-semibold text-foreground border border-border">
                    {project.fakulte}
                  </div>
                </div>

                {/* İçerik */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-lg text-foreground line-clamp-1 group-hover:text-erciyes-red transition-colors mb-1">
                      {project.title}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-3 mb-4 leading-normal">
                      {project.description}
                    </p>
                  </div>

                  {/* Yazar ve İstatistikler */}
                  <div className="border-t border-border pt-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {project.author?.avatar_url ? (
                        <div className="relative w-7 h-7 rounded-full overflow-hidden border border-border">
                          <Image src={project.author.avatar_url} alt={authorName} fill className="object-cover" />
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-muted-foreground uppercase">
                          {authorName.slice(0, 2)}
                        </div>
                      )}
                      <span className="text-xs text-muted-foreground font-medium truncate max-w-[100px]">
                        {authorName}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-muted-foreground">
                      <button
                        onClick={(e) => handleLike(project.id, e)}
                        className={cn(
                          'flex items-center gap-1 text-xs hover:text-destructive transition-colors',
                          project.liked_by_me && 'text-destructive'
                        )}
                      >
                        <Heart className={cn('w-4 h-4', project.liked_by_me && 'fill-current')} />
                        <span>{project.likes_count}</span>
                      </button>
                      <div className="flex items-center gap-1 text-xs">
                        <MessageSquare className="w-4 h-4" />
                        <span>{project.comment_count}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* ─── YENİ PROJE EKLEME MODAL (Pop-up) ────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />

          <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl p-6 z-10">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-bold text-lg text-foreground mb-1 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-erciyes-red" />
              {t('projects.shareTitle')}
            </h3>
            <p className="text-xs text-muted-foreground mb-6">
              Görsellerle desteklenmiş projenizi kampüs topluluğuyla paylaşın.
            </p>

            {modalError && (
              <div className="p-3 mb-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSubmitProject} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  {t('projects.projectTitle')}
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Örn: Akıllı Kampüs İklim Takip Sistemi"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-secondary border border-border text-xs focus:outline-none focus:border-erciyes-red"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  {t('projects.description')}
                </label>
                <MentionTextarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Projenin amacı, kullanılan teknolojiler ve özellikleri..."
                  required
                  rows={4}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-secondary border border-border text-xs focus:outline-none focus:border-erciyes-red resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    {t('projects.facultySelect')}
                  </label>
                  <select
                    value={newFaculty}
                    onChange={(e) => setNewFaculty(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-xs focus:outline-none focus:border-erciyes-red cursor-pointer"
                  >
                    <option value="">Fakülte Seçin...</option>
                    {ERU_FAKULTELERI.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Proje Görselleri
                  </label>
                  <div className="flex flex-wrap gap-2 items-center min-h-[42px]">
                    {uploadedImages.map((url, idx) => (
                      <div key={idx} className="relative w-12 h-10 rounded-lg overflow-hidden border border-border group bg-secondary flex-shrink-0">
                        <img src={url} alt="Önizleme" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setUploadedImages((prev) => prev.filter((_, i) => i !== idx))}
                          className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    
                    {imageUploading ? (
                      <div className="w-12 h-10 rounded-lg border border-dashed border-border flex flex-col items-center justify-center text-[8px] text-muted-foreground bg-secondary/20 flex-shrink-0">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-erciyes-red" />
                        <span>%{Math.round(imageUploadProgress ?? 0)}</span>
                      </div>
                    ) : (
                      <>
                        <input
                          type="file"
                          id="project-image-file"
                          accept="image/*"
                          onChange={handleProjectImageUpload}
                          className="hidden"
                        />
                        <label
                          htmlFor="project-image-file"
                          className="w-12 h-10 rounded-lg border border-dashed border-border hover:border-erciyes-red hover:bg-secondary/40 transition-all flex items-center justify-center cursor-pointer text-muted-foreground hover:text-foreground flex-shrink-0"
                          title="Görsel Ekle"
                        >
                          <Plus className="w-4 h-4" />
                        </label>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 py-3 rounded-full bg-erciyes-red hover:bg-red-800 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {t('projects.publish')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-3 rounded-full border border-border hover:bg-secondary text-xs font-semibold transition-colors"
                >
                  {t('projects.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProjelerPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-erciyes-red" />
      </div>
    }>
      <ProjelerPageContent />
    </Suspense>
  );
}
