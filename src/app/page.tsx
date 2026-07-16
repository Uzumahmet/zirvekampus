'use client';

import { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/app/providers';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { useSearchParams, useRouter } from 'next/navigation';
import ForumSidebar from '@/components/layout/sidebar-forum';
import FollowSuggestions from '@/components/shared/follow-suggestions';
import {
  Flame,
  BookOpen,
  Heart,
  MessageSquare,
  Eye,
  Clock,
  FolderCode,
  Sparkles,
  Loader2,
  ArrowRight,
  User,
  Plus,
  Compass,
  PenSquare,
  Bookmark,
  Share2,
  Repeat,
  Trash2,
  Image as ImageIcon,
  X,
  Users
} from 'lucide-react';
import { cn, formatRelativeTime, calculateReadingTime } from '@/lib/utils';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase/clientApp';
import type { MakaleWithAuthor, ProjeWithAuthor } from '@/types';
import PostCreateForm from '@/components/shared/post-create-form';

const ERU_FAKULTELERI = [
  'Mühendislik Fakültesi',
  'Tıp Fakültesi',
  'Diş Hekimliği Fakültesi',
  'Eczacılık Fakültesi',
  'Fen Fakültesi',
  'Edebiyat Fakültesi',
  'İktisadi ve İdari Bilimler Fakültesi',
  'İlahiyat Fakültesi',
  'İletişim Fakültesi',
  'Mimarlık Fakültesi',
  'Güzel Sanatlar Fakültesi',
  'Hukuk Fakültesi',
  'Eğitim Fakültesi',
  'Sağlık Bilimleri Fakültesi',
  'Spor Bilimleri Fakültesi',
  'Turizm Fakültesi',
  'Veteriner Fakültesi',
  'Ziraat Fakültesi',
  'Havacılık ve Uzay Bilimleri Fakültesi'
];

type FeedItem =
  | { type: 'article'; data: MakaleWithAuthor }
  | { type: 'project'; data: ProjeWithAuthor }
  | { type: 'post'; data: any };

export default function HomePage() {
  const { dbUser, firebaseUser, isAuthenticated, isLoading } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [forumTopics, setForumTopics] = useState<any[]>([]);
  const [activeClubs, setActiveClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Likes & Saves state simulation for interactive feel
  const [likedItems, setLikedItems] = useState<Record<string, boolean>>({});
  const [savedItems, setSavedItems] = useState<Record<string, boolean>>({});

  // Modals
  const [showPostModal, setShowPostModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);

  // Project Creation States
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [projectFaculty, setProjectFaculty] = useState('');
  const [projectImages, setProjectImages] = useState<string[]>([]);
  const [isUploadingProjectImage, setIsUploadingProjectImage] = useState(false);
  const [projectImageProgress, setProjectImageProgress] = useState<number | null>(null);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [isPendingProject, startProjectTransition] = useTransition();

  // searchParams ile modal açma (URL üzerinden)
  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    
    if (searchParams.get('yeni_post') === 'true') {
      setShowPostModal(true);
      router.replace('/', { scroll: false });
    } else if (searchParams.get('yeni_proje') === 'true') {
      setShowProjectModal(true);
      router.replace('/', { scroll: false });
    }
  }, [searchParams, isAuthenticated, isLoading, router]);

  // Custom event ile modal açma
  useEffect(() => {
    const handleOpenPost = () => {
      if (isAuthenticated) setShowPostModal(true);
    };
    const handleOpenProject = () => {
      if (isAuthenticated) { setShowProjectModal(true); setProjectError(null); }
    };
    window.addEventListener('open-post-modal', handleOpenPost);
    window.addEventListener('open-project-modal', handleOpenProject);
    return () => {
      window.removeEventListener('open-post-modal', handleOpenPost);
      window.removeEventListener('open-project-modal', handleOpenProject);
    };
  }, [isAuthenticated]);

  const handleUploadProjectImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !firebaseUser) return;
    if (file.size > 5 * 1024 * 1024) { setProjectError('Dosya 5MB\'dan küçük olmalıdır.'); return; }
    if (!file.type.startsWith('image/')) { setProjectError('Geçerli bir resim seçin.'); return; }

    setIsUploadingProjectImage(true);
    setProjectImageProgress(0);
    setProjectError(null);

    const ext = file.name.split('.').pop() || 'png';
    const filePath = `uploads/${firebaseUser.uid}/project_${Date.now()}.${ext}`;
    const storageRef = ref(storage, filePath);
    const metadata = { contentType: file.type };
    const uploadTask = uploadBytesResumable(storageRef, file, metadata);

    uploadTask.on('state_changed',
      (snap) => setProjectImageProgress((snap.bytesTransferred / snap.totalBytes) * 100),
      (err) => { setProjectError('Görsel yüklenemedi: ' + err.message); setIsUploadingProjectImage(false); },
      async () => {
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          setProjectImages((prev) => [...prev, url]);
        } catch { setProjectError('Bağlantı adresi alınamadı.'); }
        finally { setIsUploadingProjectImage(false); setProjectImageProgress(null); }
      }
    );
  };

  const handleSubmitProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setProjectError(null);
    if (!projectTitle.trim() || !projectDesc.trim()) { setProjectError('Başlık ve açıklama zorunludur.'); return; }
    if (!projectFaculty) { setProjectError('Lütfen fakülte seçin.'); return; }
    if (projectImages.length === 0) { setProjectError('Lütfen en az 1 görsel ekleyin.'); return; }
    if (!firebaseUser) return;

    startProjectTransition(async () => {
      try {
        const res = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${firebaseUser!.idToken}` },
          body: JSON.stringify({ title: projectTitle, description: projectDesc, fakulte: projectFaculty, imageUrls: projectImages }),
        });

        if (res.ok) {
          const json = await res.json();
          setFeedItems((prev) => [
            { type: 'project', data: { ...json.project, author: { id: dbUser?.id, username: dbUser?.username, display_name: dbUser?.display_name, avatar_url: dbUser?.avatar_url } } },
            ...prev
          ]);
          setShowProjectModal(false);
          setProjectTitle(''); setProjectDesc(''); setProjectFaculty(''); setProjectImages([]);
        } else {
          const data = await res.json();
          setProjectError(data.error || 'Proje paylaşılamadı.');
        }
      } catch { setProjectError('Sunucu bağlantısı kurulamadı.'); }
    });
  };

  const fetchHomeData = async () => {
    try {
      const headers: Record<string, string> = {};
      if (firebaseUser) {
        headers['Authorization'] = `Bearer ${firebaseUser.idToken}`;
      }

      const [projectsRes, postsRes, articlesRes, forumRes, clubsRes] = await Promise.all([
        fetch('/api/projects?limit=6', { headers }),
        fetch('/api/projects?fakulte=gonderi&limit=15', { headers }),
        fetch('/api/article?limit=6', { headers }),
        fetch('/api/forum?limit=8', { headers }),
        fetch('/api/clubs', { headers }),
      ]);

      let projectsData: ProjeWithAuthor[] = [];
      let postsData: any[] = [];
      let articlesData: MakaleWithAuthor[] = [];
      let forumData: any[] = [];
      let clubsData: any[] = [];

      if (projectsRes.ok) projectsData = await projectsRes.json();
      if (postsRes.ok) postsData = await postsRes.json();
      if (articlesRes.ok) {
        const artJson = await articlesRes.json();
        articlesData = Array.isArray(artJson) ? artJson : (artJson.articles ?? []);
      }
      if (forumRes.ok) {
        const forumJson = await forumRes.json();
        forumData = Array.isArray(forumJson) ? forumJson : (forumJson.topics ?? []);
      }
      if (clubsRes && clubsRes.ok) {
        const clubsJson = await clubsRes.json();
        const allClubs = clubsJson.clubs || [];
        allClubs.sort((a: any, b: any) => (b.member_count || 0) - (a.member_count || 0));
        clubsData = allClubs.slice(0, 3);
      }

      const combined: FeedItem[] = [
        ...projectsData.map((p) => ({ type: 'project' as const, data: p })),
        ...postsData.map((p) => ({ type: 'post' as const, data: p })),
        ...articlesData.map((a) => ({ type: 'article' as const, data: a })),
      ];

      combined.sort((a, b) => {
        return new Date(b.data.created_at).getTime() - new Date(a.data.created_at).getTime();
      });

      setFeedItems(combined);
      setForumTopics(forumData);
      setActiveClubs(clubsData);
    } catch (e) {
      console.error('Anasayfa verileri çekilemedi:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoading) return;
    fetchHomeData();
  }, [firebaseUser?.uid, isLoading]);

  const handleLike = (id: string) => {
    setLikedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSave = (id: string) => {
    setSavedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* SOL KOLON: Profil Kartı & Hızlı Linkler - 3 Sütun */}
        <aside className="hidden xl:block xl:col-span-3 space-y-6 order-2 xl:order-1">
          {isAuthenticated && dbUser ? (
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm group">
              <div className="h-16 bg-gradient-to-r from-erciyes-red/80 to-red-950 relative" />
              
              <div className="px-5 pb-5 relative flex flex-col items-center text-center -mt-8">
                <Link href={`/${dbUser.username}`} className="relative block w-16 h-16 rounded-full overflow-hidden border-2 border-card shadow-md">
                  {dbUser.avatar_url ? (
                    <Image src={dbUser.avatar_url} alt={dbUser.display_name ?? dbUser.username} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full bg-secondary flex items-center justify-center font-bold text-lg uppercase">
                      {dbUser.username?.slice(0, 2)}
                    </div>
                  )}
                </Link>
                <h3 className="font-bold text-base text-foreground leading-tight mt-3">
                  {dbUser.display_name || dbUser.username}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">@{dbUser.username}</p>
              </div>

              <div className="pt-2 px-5 pb-5">
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="text-center">
                    <p className="font-bold text-foreground">Proje</p>
                    <p className="text-[10px] font-semibold mt-0.5 truncate max-w-[80px]">
                      {(dbUser as any).projeler_count || 0}
                    </p>
                  </div>
                  <div className="w-px bg-border" />
                  <div className="text-center">
                    <p className="font-bold text-foreground">Fakülte</p>
                    <p className="text-[10px] font-semibold mt-0.5 truncate max-w-[80px]">
                      {dbUser.fakulte || 'Belirtilmemiş'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl p-5 text-center shadow-sm space-y-4">
              <h3 className="font-bold text-sm">Zirve Kampüs'e Katıl</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Projelerini sergilemek, makaleler yayınlamak ve diğer öğrencilerle bağlantı kurmak için hemen giriş yap.
              </p>
            </div>
          )}

          {/* Hızlı Linkler */}
          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
            <h3 className="font-bold text-xs text-muted-foreground uppercase tracking-wider mb-3 px-2">Keşfet</h3>
            <div className="space-y-1">
              <Link href="/projeler" className="flex items-center gap-2.5 px-2 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
                <FolderCode className="w-4 h-4 text-emerald-500" /> Projeler
              </Link>
              <Link href="/makale" className="flex items-center gap-2.5 px-2 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
                <BookOpen className="w-4 h-4 text-amber-500" /> Makale Akışı
              </Link>
              <Link href="/kesfet" className="flex items-center gap-2.5 px-2 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
                <Compass className="w-4 h-4 text-emerald-500" /> Öğrenci Keşfet
              </Link>
              <Link href="/kulupler" className="flex items-center gap-2.5 px-2 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
                <Users className="w-4 h-4 text-rose-500" /> Öğrenci Kulüpleri
              </Link>
              <Link href="/forum" className="flex items-center gap-2.5 px-2 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
                <MessageSquare className="w-4 h-4 text-cyan-500" /> Kampüs Forumu
              </Link>
            </div>
          </div>
        </aside>

        {/* ORTA KOLON: Create Post + Feed - 6 Sütun */}
        <main className="col-span-12 xl:col-span-6 space-y-6 order-1 xl:order-2">
          
          {/* Gönderi Paylaş Modal */}
          {showPostModal && isAuthenticated && dbUser && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) { setShowPostModal(false); } }}>
              <div className="w-full sm:max-w-2xl bg-card border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
                <PostCreateForm
                  onCancel={() => setShowPostModal(false)}
                  onSuccess={(newPost) => {
                    setFeedItems((prev) => [
                      { type: 'post', data: newPost },
                      ...prev
                    ]);
                    setShowPostModal(false);
                  }}
                />
              </div>
            </div>
          )}

          {/* Proje Ekleme Modal */}
          {showProjectModal && isAuthenticated && dbUser && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) { setShowProjectModal(false); } }}>
              <div className="w-full sm:max-w-lg bg-card border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden max-h-[90vh] flex flex-col">
                <div className="p-4 border-b border-border flex items-center justify-between flex-shrink-0">
                  <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                    <FolderCode className="w-4 h-4 text-emerald-500" /> Yeni Proje Paylaş
                  </h3>
                  <button onClick={() => { setShowProjectModal(false); setProjectError(null); }} className="p-2 rounded-xl hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <form onSubmit={handleSubmitProject} className="p-5 space-y-4 overflow-y-auto flex-1">
                  {projectError && (
                    <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs font-semibold text-destructive">
                      {projectError}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Proje Görselleri</label>
                    <div className="grid grid-cols-4 gap-2">
                      {projectImages.map((url, idx) => (
                        <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-border">
                          <Image src={url} alt="" fill className="object-cover" />
                        </div>
                      ))}
                      {projectImages.length < 4 && (
                        <label className="aspect-square rounded-xl border border-dashed border-border/80 hover:bg-secondary/20 cursor-pointer flex flex-col items-center justify-center gap-1 transition-colors">
                          <Plus className="w-5 h-5 text-muted-foreground" />
                          <span className="text-[10px] font-bold text-muted-foreground">Ekle</span>
                          <input type="file" accept="image/*" className="hidden" onChange={handleUploadProjectImage} disabled={isUploadingProjectImage} />
                        </label>
                      )}
                    </div>
                    {projectImageProgress !== null && (
                      <div className="w-full bg-secondary rounded-full h-1 mt-2 overflow-hidden">
                        <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${projectImageProgress}%` }} />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Proje Adı</label>
                    <input type="text" placeholder="Projenize bir başlık verin..." value={projectTitle} onChange={(e) => setProjectTitle(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-border bg-transparent text-sm focus:outline-none focus:border-emerald-500 transition-colors" />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Fakülte</label>
                    <select value={projectFaculty} onChange={(e) => setProjectFaculty(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-border bg-card text-sm focus:outline-none focus:border-emerald-500 transition-colors">
                      <option value="">Fakülte Seçin...</option>
                      {ERU_FAKULTELERI.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Açıklama</label>
                    <textarea rows={4} placeholder="Projenizi detaylıca açıklayın, kullanılan teknolojileri belirtin..." value={projectDesc} onChange={(e) => setProjectDesc(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-border bg-transparent text-sm focus:outline-none focus:border-emerald-500 transition-colors resize-none" />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button type="submit" disabled={isPendingProject} className="flex-1 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                      {isPendingProject && <Loader2 className="w-4 h-4 animate-spin" />}
                      Projeyi Paylaş
                    </button>
                    <button type="button" onClick={() => { setShowProjectModal(false); setProjectError(null); }} className="px-5 py-3 rounded-xl border border-border hover:bg-secondary text-sm font-semibold transition-colors">
                      İptal
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Hızlı Paylaşım Tetikleyici */}
          {isAuthenticated && dbUser && (
            <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
              <div className="flex gap-3 items-center">
                <div className="relative w-9 h-9 rounded-full overflow-hidden border border-border flex-shrink-0">
                  {dbUser.avatar_url ? (
                    <Image src={dbUser.avatar_url} alt={dbUser.username} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full bg-secondary flex items-center justify-center font-bold text-xs uppercase">
                      {dbUser.username?.slice(0, 2)}
                    </div>
                  )}
                </div>
                <button onClick={() => setShowPostModal(true)} className="flex-1 h-9 px-4 rounded-xl bg-secondary/50 hover:bg-secondary text-left text-xs text-muted-foreground hover:text-foreground transition-all flex items-center border border-border/50">
                  Paylaşmak istediğin bir şey mi var?
                </button>
              </div>
              <div className="flex justify-between items-center border-t border-border/50 mt-3 pt-3 px-2 text-[11px] text-muted-foreground gap-4">
                <button onClick={() => setShowPostModal(true)} className="flex items-center gap-1.5 hover:text-cyan-500 transition-colors font-semibold">
                  <PenSquare className="w-3.5 h-3.5 text-cyan-500" />
                  <span>Tartışma Başlat</span>
                </button>
                <button onClick={() => setShowPostModal(true)} className="flex items-center gap-1.5 hover:text-amber-500 transition-colors font-semibold">
                  <ImageIcon className="w-3.5 h-3.5 text-amber-500" />
                  <span>Fotoğraf Paylaş</span>
                </button>
                <button onClick={() => { setShowProjectModal(true); setProjectError(null); }} className="flex items-center gap-1.5 hover:text-emerald-500 transition-colors font-semibold">
                  <FolderCode className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Proje Ekle</span>
                </button>
              </div>
            </div>
          )}

          {/* Akış Başlığı */}
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-erciyes-red animate-pulse" />
              <h2 className="font-bold text-sm text-foreground">Kampüs Zaman Tüneli</h2>
            </div>
          </div>

          {/* Feed Listesi */}
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-erciyes-red" />
              <p className="text-xs text-muted-foreground font-medium">Zaman tüneli yükleniyor...</p>
            </div>
          ) : feedItems.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-border rounded-3xl">
              <p className="text-sm text-muted-foreground">Henüz paylaşılan içerik yok.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {feedItems.map((item) => {
                const isProject = item.type === 'project';
                const isPost = item.type === 'post';
                
                if (isProject) {
                  const project = item.data;
                  const authorName = project.author?.display_name ?? project.author?.username ?? 'Öğrenci';
                  const projectImage = project.image_urls?.[0];
                  const itemId = `proj-${project.id}`;
                  const isLiked = likedItems[itemId];
                  const isSaved = savedItems[itemId];

                  return (
                    <article key={itemId} className="bg-card border border-border rounded-2xl overflow-hidden hover:border-border/80 transition-all duration-300 shadow-sm">
                      <div className="p-4 flex items-center justify-between">
                        <Link href={`/${project.author?.username}`} className="flex items-center gap-2.5 group">
                          {project.author?.avatar_url ? (
                            <div className="relative w-9 h-9 rounded-full overflow-hidden border border-border flex-shrink-0">
                              <Image src={project.author.avatar_url} alt={authorName} fill className="object-cover" />
                            </div>
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center font-bold text-muted-foreground text-xs uppercase border border-border flex-shrink-0">
                              {authorName.slice(0, 2)}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-xs text-foreground group-hover:text-erciyes-red transition-colors leading-tight">{authorName}</p>
                            <p className="text-[9px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <span>{project.fakulte || 'Kampüs'}</span>
                              <span>•</span>
                              <span>{formatRelativeTime(project.created_at)}</span>
                            </p>
                          </div>
                        </Link>
                      </div>

                      <div className="px-4 pb-3">
                        <Link href={`/projeler/${project.id}`}>
                          <h3 className="font-bold text-base text-foreground hover:text-erciyes-red transition-colors mb-1.5 leading-snug">{project.title}</h3>
                        </Link>
                        <p className="text-xs text-muted-foreground leading-normal line-clamp-3">{project.description}</p>
                      </div>

                      {projectImage && (
                        <Link href={`/projeler/${project.id}`} className="block relative aspect-[16/9] w-full bg-secondary overflow-hidden border-y border-border/50">
                          <Image src={projectImage} alt={project.title} fill className="object-cover hover:scale-[1.02] transition-transform duration-500" />
                        </Link>
                      )}

                      <div className="p-3.5 px-4 flex items-center justify-between text-xs text-muted-foreground bg-secondary/5">
                        <div className="flex items-center gap-4">
                          <button type="button" onClick={() => handleLike(itemId)} className={cn("flex items-center gap-1.5 hover:text-destructive transition-colors font-medium", isLiked && "text-destructive")}>
                            <Heart className={cn("w-4.5 h-4.5", isLiked && "fill-current")} />
                            <span>{project.likes_count + (isLiked ? 1 : 0)} Beğeni</span>
                          </button>
                          <Link href={`/projeler/${project.id}`} className="flex items-center gap-1.5 hover:text-foreground transition-colors font-medium">
                            <MessageSquare className="w-4.5 h-4.5" />
                            <span>{project.comment_count ?? 0} Yorum</span>
                          </Link>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            <span>{project.views_count} Görüntülenme</span>
                          </span>
                          <button type="button" onClick={() => handleSave(itemId)} className={cn("hover:text-foreground transition-colors", isSaved && "text-cyan-500")}>
                            <Bookmark className={cn("w-4 h-4", isSaved && "fill-current")} />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                }

                if (isPost) {
                  const post = item.data;
                  const authorName = post.author?.display_name ?? post.author?.username ?? 'Öğrenci';
                  const itemId = `post-${post.id}`;
                  const isLiked = likedItems[itemId];
                  const isSaved = savedItems[itemId];

                  return (
                    <article key={itemId} className="bg-card border border-border rounded-2xl overflow-hidden hover:border-border/80 transition-all duration-300 shadow-sm">
                      <div className="p-4 flex items-center justify-between">
                        <Link href={`/${post.author?.username}`} className="flex items-center gap-2.5 group">
                          {post.author?.avatar_url ? (
                            <div className="relative w-9 h-9 rounded-full overflow-hidden border border-border flex-shrink-0">
                              <Image src={post.author.avatar_url} alt={authorName} fill className="object-cover" />
                            </div>
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center font-bold text-muted-foreground text-xs uppercase border border-border flex-shrink-0">
                              {authorName.slice(0, 2)}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-xs text-foreground group-hover:text-erciyes-red transition-colors leading-tight">{authorName}</p>
                            <p className="text-[9px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <span>Kampüs Gönderisi</span>
                              <span>•</span>
                              <span>{formatRelativeTime(post.created_at)}</span>
                            </p>
                          </div>
                        </Link>
                      </div>

                      <div className="px-4 pb-3 text-sm text-foreground/90 whitespace-pre-wrap break-words leading-relaxed">
                        {post.content}
                      </div>

                      {post.image_urls && post.image_urls.length > 0 && (
                        <div className="px-4 pb-3">
                          <div className={cn(
                            "grid gap-1.5 rounded-xl overflow-hidden border border-border/50",
                            post.image_urls.length === 1 ? "grid-cols-1" :
                            post.image_urls.length === 2 ? "grid-cols-2 aspect-[16/10]" :
                            "grid-cols-3 aspect-[16/10]"
                          )}>
                            {post.image_urls.map((url: string, idx: number) => (
                              <div key={idx} className="relative w-full h-full min-h-[200px] bg-secondary">
                                <Image src={url} alt="" fill className="object-cover hover:scale-[1.02] transition-transform duration-500" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="p-3 px-4 flex items-center justify-between text-xs text-muted-foreground bg-secondary/5 border-t border-border/30">
                        <div className="flex items-center gap-4">
                          <button type="button" onClick={() => handleLike(itemId)} className={cn("flex items-center gap-1.5 hover:text-destructive transition-colors font-medium", isLiked && "text-destructive")}>
                            <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
                            <span>{post.likes_count + (isLiked ? 1 : 0)} Beğeni</span>
                          </button>
                          <Link href={`/projeler/${post.id}`} className="flex items-center gap-1.5 hover:text-foreground transition-colors font-medium">
                            <MessageSquare className="w-4 h-4" />
                            <span>{post.comment_count ?? 0} Yorum</span>
                          </Link>
                        </div>
                        <button type="button" onClick={() => handleSave(itemId)} className={cn("hover:text-foreground transition-colors", isSaved && "text-cyan-500")}>
                          <Bookmark className={cn("w-4 h-4", isSaved && "fill-current")} />
                        </button>
                      </div>
                    </article>
                  );
                }

                // Makale Kartı
                const article = item.data;
                const authorName = article.author?.display_name ?? article.author?.username ?? 'Yazar';
                const readingTime = calculateReadingTime(article.content);
                const itemId = `art-${article.id}`;
                const isLiked = likedItems[itemId];
                const isSaved = savedItems[itemId];

                return (
                  <article key={itemId} className="bg-card border border-border rounded-2xl overflow-hidden hover:border-border/80 transition-all duration-300 shadow-sm">
                    <div className="p-4 flex items-center justify-between">
                      <Link href={`/yazar/${article.author?.username}`} className="flex items-center gap-2.5 group">
                        {article.author?.avatar_url ? (
                          <div className="relative w-9 h-9 rounded-full overflow-hidden border border-border">
                            <Image src={article.author.avatar_url} alt={authorName} fill className="object-cover" />
                          </div>
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center font-bold text-muted-foreground text-xs uppercase border border-border">
                            {authorName.slice(0, 2)}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-sm text-foreground group-hover:text-erciyes-red transition-colors leading-tight">{authorName}</p>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <span>{formatRelativeTime(article.created_at)}</span>
                          </p>
                        </div>
                      </Link>
                      <span className="text-[10px] font-bold uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <BookOpen className="w-3 h-3" /> Makale
                      </span>
                    </div>

                    <div className="px-4 pb-4 flex flex-col md:flex-row gap-4">
                      <div className="flex-1 min-w-0">
                        <Link href={`/makale/${article.slug}`}>
                          <h3 className="font-bold text-base text-foreground hover:text-erciyes-red transition-colors mb-1.5 leading-snug">{article.title}</h3>
                        </Link>
                        <p className="text-xs text-muted-foreground leading-normal line-clamp-3">{article.excerpt || 'Makalenin devamını okumak için tıklayın.'}</p>
                      </div>
                      {article.cover_image && (
                        <Link href={`/makale/${article.slug}`} className="relative w-full md:w-36 aspect-[16/10] md:h-24 rounded-xl overflow-hidden bg-secondary flex-shrink-0">
                          <Image src={article.cover_image} alt={article.title} fill className="object-cover hover:scale-105 transition-transform duration-500" />
                        </Link>
                      )}
                    </div>

                    <div className="p-3.5 px-4 flex items-center justify-between text-xs text-muted-foreground bg-secondary/5 border-t border-border/30">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {readingTime} dk okuma
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" />
                          {article.views_count} Görüntülenme
                        </span>
                        <button type="button" onClick={() => handleLike(itemId)} className={cn("flex items-center gap-1 hover:text-destructive transition-colors", isLiked && "text-destructive")}>
                          <Heart className={cn("w-3.5 h-3.5", isLiked && "fill-current")} />
                        </button>
                        <button type="button" onClick={() => handleSave(itemId)} className={cn("hover:text-foreground transition-colors", isSaved && "text-cyan-500")}>
                          <Bookmark className={cn("w-3.5 h-3.5", isSaved && "fill-current")} />
                        </button>
                      </div>
                      <Link href={`/makale/${article.slug}`} className="flex items-center gap-1 text-xs text-erciyes-red font-semibold hover:underline">
                        Daha fazla oku <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </main>

        {/* SAĞ KOLON: Öneriler & Forum sidebar - 3 Sütun */}
        <aside className="hidden xl:block xl:col-span-3 space-y-6 order-3">
          {isAuthenticated && <FollowSuggestions />}

          {/* Aktif Kulüpler Kartı */}
          {activeClubs.length > 0 && (
            <div className="p-5 bg-card border border-border rounded-2xl shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-rose-500" />
                  <h3 className="font-bold text-sm text-foreground">Aktif Kulüpler</h3>
                </div>
                <Link href="/kulupler" className="text-[10px] font-bold text-erciyes-red hover:underline">
                  Tümünü Gör
                </Link>
              </div>
              <div className="space-y-3.5">
                {activeClubs.map((club) => {
                  const hasLogo = !!club.logo_url;
                  return (
                    <Link
                      key={club.id}
                      href={`/kulup/${club.slug}`}
                      className="flex items-center justify-between group hover:opacity-95"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {hasLogo ? (
                          <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-border flex-shrink-0">
                            <Image src={club.logo_url} alt={club.name} fill className="object-cover" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-secondary border border-border flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0">
                            {club.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-foreground group-hover:text-erciyes-red transition-colors truncate">
                            {club.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Users className="w-3 h-3 text-rose-500" /> {club.member_count} Üye
                          </p>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold text-erciyes-red bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20 opacity-0 group-hover:opacity-100 transition-opacity">
                        Katıl
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          <div className="sticky top-20">
            <div className="p-5 bg-card border border-border rounded-2xl shadow-sm">
              <div className="flex items-center gap-2 mb-4 border-b border-border/60 pb-3">
                <BookOpen className="w-4 h-4 text-erciyes-red" />
                <h3 className="font-bold text-sm text-foreground">{t('home.forumTitle')}</h3>
              </div>
              <ForumSidebar topics={forumTopics} compact />
            </div>
          </div>
        </aside>

      </div>
    </div>
  );
}
