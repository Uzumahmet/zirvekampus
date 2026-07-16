'use client';

import { useState, useEffect, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers';

import { 
  Users, Calendar, Briefcase, FolderCode, Award, Shield, UserCheck, CheckCircle2,
  Clock, AlertTriangle, MessageSquare, ChevronRight, Sparkles, Loader2, Flag,
  PlusCircle, Edit3, Trash2, Check, X, ShieldAlert, FileText, Send
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClubDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  vision: string | null;
  member_count: number;
  president_id: string | null;
  president_appointed_at: string;
  user_role: string | null; // president, leader, member, alumni
  user_status: string | null; // pending, approved
  founder: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  president: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface Member {
  id: string;
  user_id: string;
  role: string;
  team_name: string | null;
  status: string;
  created_at: string;
  user: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    fakulte: string | null;
  };
}

interface Project {
  id: string;
  title: string;
  description: string | null;
  image_urls: string[];
  status: string;
  leader_id: string | null;
  leader: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface Event {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  event_date: string;
  rsvp_yes_count: number;
  rsvp_maybe_count: number;
  my_rsvp_status: string | null;
}

interface Recruitment {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  is_active: boolean;
  applications?: Application[];
  my_application?: Application | null;
}

interface Application {
  id: string;
  recruitment_id: string;
  user_id: string;
  cover_letter: string | null;
  status: string;
  created_at: string;
  user?: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    email: string;
    school_email: string | null;
    phone_number: string | null;
    fakulte: string | null;
  };
}

interface HandoverInfo {
  president_expired: boolean;
  handover: {
    id: string;
    candidate_id: string;
    expires_at: string;
    status: string;
    candidate: {
      username: string;
      display_name: string | null;
      avatar_url: string | null;
    };
  } | null;
  approvals_count: number;
  approvals: string[];
  my_approved: boolean;
}

export default function ClubProfilePage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const router = useRouter();
  const { firebaseUser, dbUser, isAuthenticated } = useAuth();
  
  const [club, setClub] = useState<ClubDetail | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [recruitments, setRecruitments] = useState<Recruitment[]>([]);
  const [handoverInfo, setHandoverInfo] = useState<HandoverInfo | null>(null);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'about' | 'projects' | 'recruitments' | 'events' | 'members'>('about');
  const [isPending, startTransition] = useTransition();

  // Şikayet Modalı
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportDesc, setReportDesc] = useState('');
  const [reportSuccess, setReportSuccess] = useState('');
  const [reportError, setReportError] = useState('');

  // Başvuru Modalı
  const [activeApplyRec, setActiveApplyRec] = useState<Recruitment | null>(null);
  const [applyLetter, setApplyLetter] = useState('');
  const [applyError, setApplyError] = useState('');
  const [applySuccess, setApplySuccess] = useState('');

  useEffect(() => {
    fetchClubData();
  }, [slug, firebaseUser]);

  const fetchClubData = async () => {
    try {
      const headers: Record<string, string> = {};
      if (firebaseUser?.idToken) {
        headers['Authorization'] = `Bearer ${firebaseUser.idToken}`;
      }

      // 1. Club Info
      const res = await fetch(`/api/clubs/${slug}`, { headers });
      if (!res.ok) throw new Error();
      const clubData = await res.json();
      setClub(clubData.club);

      // 2. Members
      const membersRes = await fetch(`/api/clubs/${slug}/members`, { headers });
      if (membersRes.ok) {
        const memData = await membersRes.json();
        setMembers(memData.members || []);
      }

      // 3. Projects
      const projRes = await fetch(`/api/clubs/${slug}/projects`);
      if (projRes.ok) {
        const pData = await projRes.json();
        setProjects(pData.projects || []);
      }

      // 4. Events
      const evRes = await fetch(`/api/clubs/${slug}/events`, { headers });
      if (evRes.ok) {
        const eData = await evRes.json();
        setEvents(eData.events || []);
      }

      // 5. Recruitments
      const recRes = await fetch(`/api/clubs/${slug}/recruitments`, { headers });
      if (recRes.ok) {
        const rData = await recRes.json();
        setRecruitments(rData.recruitments || []);
      }

      // 6. Handover status
      const handoverRes = await fetch(`/api/clubs/${slug}/handover`, { headers });
      if (handoverRes.ok) {
        const hData = await handoverRes.json();
        setHandoverInfo(hData);
      }
    } catch (e) {
      console.error('Kulüp verileri yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClub = async () => {
    if (!isAuthenticated) {
      window.location.href = '/giris-yap';
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch(`/api/clubs/${slug}/members`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${firebaseUser?.idToken}`,
          },
          body: JSON.stringify({}),
        });
        const data = await res.json();
        if (res.ok) {
          alert('Katılım başvurunuz alındı. Kulüp başkanı onayladığında üye listesinde görüneceksiniz.');
          fetchClubData();
        } else {
          alert(data.error || 'Başvuru yapılamadı.');
        }
      } catch (err) {
        alert('Bağlantı hatası oluştu.');
      }
    });
  };

  const handleRsvpEvent = async (eventId: string, rsvpStatus: 'yes' | 'no' | 'maybe') => {
    if (!isAuthenticated) {
      window.location.href = '/giris-yap';
      return;
    }
    try {
      const res = await fetch(`/api/clubs/${slug}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${firebaseUser?.idToken}`,
        },
        body: JSON.stringify({
          action: 'rsvp',
          eventId,
          rsvpStatus,
        }),
      });
      if (res.ok) {
        fetchClubData();
      } else {
        const d = await res.json();
        alert(d.error || 'LCV katılımınız kaydedilemedi.');
      }
    } catch (err) {
      alert('Bağlantı hatası.');
    }
  };

  const handleApplyRecruitment = async (e: React.FormEvent) => {
    e.preventDefault();
    setApplyError('');
    setApplySuccess('');
    if (!activeApplyRec) return;

    startTransition(async () => {
      try {
        const res = await fetch(`/api/clubs/${slug}/recruitments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${firebaseUser?.idToken}`,
          },
          body: JSON.stringify({
            action: 'apply',
            recruitmentId: activeApplyRec.id,
            coverLetter: applyLetter,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setApplySuccess('Başvurunuz başarıyla iletildi!');
          setTimeout(() => {
            setActiveApplyRec(null);
            setApplyLetter('');
            fetchClubData();
          }, 1500);
        } else {
          setApplyError(data.error || 'Başvuru başarısız.');
        }
      } catch (err) {
        setApplyError('Bağlantı hatası.');
      }
    });
  };

  const handleClaimHandover = async () => {
    if (!confirm('Kulüp yönetimini devralmak için bir süreç başlatmak istediğinize emin misiniz?')) return;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/clubs/${slug}/handover`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${firebaseUser?.idToken}`,
          },
          body: JSON.stringify({ action: 'claim' }),
        });
        const data = await res.json();
        if (res.ok) {
          alert('Yönetim devralma iddianız başlatıldı! 1 haftalık geri sayım süresince kulübün onaylı 5 üyesinin onay vermesi gerekmektedir.');
          fetchClubData();
        } else {
          alert(data.error || 'Süreç başlatılamadı.');
        }
      } catch (err) {
        alert('Bağlantı hatası.');
      }
    });
  };

  const handleApproveHandover = async () => {
    if (!handoverInfo?.handover) return;
    const handoverId = handoverInfo.handover.id;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/clubs/${slug}/handover`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${firebaseUser?.idToken}`,
          },
          body: JSON.stringify({
            action: 'approve',
            handoverId,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          alert(data.message);
          fetchClubData();
        } else {
          alert(data.error || 'Onay verilemedi.');
        }
      } catch (err) {
        alert('Bağlantı hatası.');
      }
    });
  };

  const handleReportViolation = async (e: React.FormEvent) => {
    e.preventDefault();
    setReportError('');
    setReportSuccess('');
    
    startTransition(async () => {
      try {
        const res = await fetch(`/api/clubs/${slug}/reports`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${firebaseUser?.idToken}`,
          },
          body: JSON.stringify({ description: reportDesc }),
        });
        const data = await res.json();
        if (res.ok) {
          setReportSuccess(data.message);
          setTimeout(() => {
            setShowReportModal(false);
            setReportDesc('');
          }, 2000);
        } else {
          setReportError(data.error || 'Şikayet iletilemedi.');
        }
      } catch (err) {
        setReportError('Bağlantı hatası.');
      }
    });
  };


  const handleKickMember = async (userId: string) => {
    if (!confirm('Bu üyeyi kulüpten çıkarmak istediğinize emin misiniz?')) return;
    try {
      const res = await fetch(`/api/clubs/${slug}/members?userId=${userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${firebaseUser?.idToken}`,
        },
      });
      if (res.ok) {
        fetchClubData();
      } else {
        const d = await res.json();
        alert(d.error || 'Üye çıkarılamadı.');
      }
    } catch (e) {
      alert('Hata.');
    }
  };

  if (loading) {
    return (
      <div className="py-32 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-erciyes-red" />
        <p className="text-xs text-muted-foreground font-semibold">Kulüp sayfası yükleniyor...</p>
      </div>
    );
  }

  if (!club) {
    return (
      <div className="py-32 text-center max-w-md mx-auto space-y-4">
        <AlertTriangle className="w-12 h-12 text-destructive mx-auto" />
        <h2 className="text-lg font-bold text-foreground">Kulüp Bulunamadı</h2>
        <p className="text-xs text-muted-foreground">Aradığınız kulüp silinmiş veya mevcut adresi değiştirilmiş olabilir.</p>
        <Link href="/kulupler" className="inline-block px-5 py-2.5 rounded-full bg-secondary text-xs font-bold hover:bg-secondary/80">
          Geri Dön
        </Link>
      </div>
    );
  }

  const isClubManager = club.user_role === 'president' || club.user_role === 'leader';
  const hasAppointedPresident = !!club.president_id && !handoverInfo?.president_expired;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-28">
      {/* 1. KULÜP BANNER & HEADER */}
      <div className="relative p-6 sm:p-8 bg-card border border-border rounded-3xl overflow-hidden shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="flex items-center gap-5">
          {club.logo_url ? (
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border border-border flex-shrink-0">
              <Image src={club.logo_url} alt={club.name} fill className="object-cover" />
            </div>
          ) : (
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-secondary border border-border flex items-center justify-center text-xl font-bold text-muted-foreground flex-shrink-0">
              {club.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-black text-foreground line-clamp-1" style={{ fontFamily: 'var(--font-display)' }}>
              {club.name}
            </h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
              <Users className="w-4 h-4 text-erciyes-red" /> {club.member_count} Üye
              {club.user_role && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-primary/10 text-primary uppercase tracking-wider ml-2 border border-primary/20">
                  {club.user_role === 'president' ? 'Başkan' : club.user_role === 'leader' ? 'Takım Lideri' : 'Üye'}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Aksiyon Butonları (Katıl / Başvur, Şikayet Et) */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {isClubManager && (
            <button
              onClick={() => router.push(`/kulup/${slug}/yonetim`)}
              className="flex items-center justify-center gap-1.5 px-4.5 py-2.5 rounded-full bg-secondary hover:bg-secondary/80 border border-border text-xs font-bold text-foreground transition-all shadow-xs"
            >
              <Shield className="w-4 h-4 text-erciyes-red" /> Yönetici Paneli
            </button>
          )}

          {isAuthenticated ? (
            <>
              {!club.user_role ? (
                <button
                  onClick={handleJoinClub}
                  disabled={isPending}
                  className="px-5 py-2.5 rounded-full bg-erciyes-red text-white hover:bg-red-800 text-xs font-bold transition-all shadow-md shadow-erciyes-red/10 flex-1 sm:flex-none"
                >
                  {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Katılma İsteği Gönder'}
                </button>
              ) : club.user_status === 'pending' ? (
                <span className="px-5 py-2.5 rounded-full bg-secondary/50 border border-border text-muted-foreground text-xs font-bold text-center flex-1 sm:flex-none">
                  Onay Bekliyor...
                </span>
              ) : (
                <button
                  onClick={() => {
                    if (confirm('Bu kulüpten ayrılmak istediğinize emin misiniz?')) {
                      handleKickMember(dbUser!.id);
                    }
                  }}
                  className="px-5 py-2.5 rounded-full border border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/20 text-xs font-bold transition-colors flex-1 sm:flex-none"
                >
                  Kulüpten Ayrıl
                </button>
              )}
              
              {club.user_role && club.user_role !== 'president' && (
                <button
                  onClick={() => setShowReportModal(true)}
                  className="p-2.5 rounded-full border border-border hover:bg-secondary text-muted-foreground hover:text-destructive transition-all"
                  title="Yönetim İhlali Şikayet Et"
                >
                  <Flag className="w-4 h-4" />
                </button>
              )}
            </>
          ) : (
            <Link
              href="/giris-yap"
              className="px-5 py-2.5 rounded-full bg-erciyes-red text-white hover:bg-red-800 text-xs font-bold transition-all shadow-md shadow-erciyes-red/10 text-center flex-1 sm:flex-none"
            >
              Giriş Yap ve Katıl
            </Link>
          )}
        </div>
      </div>

      {/* 2. LİDERLİK DEVİR BANNERI (YÖNETİM DEVRİ ALGORİTMASI) */}
      {!hasAppointedPresident && (
        <div className="mt-6 p-5 bg-amber-500/10 border border-amber-500/20 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-pulse">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-extrabold text-amber-500 uppercase tracking-wider">Yönetim Devri Aktif</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Bu kulübün aktif bir başkanı bulunmamaktadır. Görev süresi dolmuş veya atanmamış durumdadır.
              </p>
            </div>
          </div>

          {!handoverInfo?.handover ? (
            <button
              onClick={handleClaimHandover}
              disabled={isPending}
              className="flex items-center gap-1.5 px-4.5 py-2 rounded-xl bg-amber-500 text-white hover:bg-amber-600 text-xs font-bold transition-all shadow-md shadow-amber-500/10"
            >
              Yönetimi Devralın
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-3 bg-card border border-border p-2 rounded-2xl">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-foreground">Aday: @{handoverInfo.handover.candidate.username}</span>
                <span className="text-[10px] text-muted-foreground">({handoverInfo.approvals_count}/5 Onay)</span>
              </div>
              
              {isAuthenticated && club.user_role && club.user_status === 'approved' && (
                <button
                  onClick={handleApproveHandover}
                  disabled={handoverInfo.my_approved || dbUser?.id === handoverInfo.handover.candidate_id}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all",
                    handoverInfo.my_approved 
                      ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" 
                      : "bg-erciyes-red text-white hover:bg-red-800"
                  )}
                >
                  {handoverInfo.my_approved ? 'Onayladınız' : 'Onayla'}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3. TABS VE ANA İÇERİK BÖLÜMÜ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mt-8">
        {/* Sol Tab Menü */}
        <div className="lg:col-span-3 flex flex-row lg:flex-col overflow-x-auto lg:overflow-visible gap-1.5 bg-card border border-border p-2 rounded-2xl scrollbar-none">
          <button
            onClick={() => setActiveTab('about')}
            className={cn(
              'flex-shrink-0 lg:w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left',
              activeTab === 'about'
                ? 'bg-erciyes-red/10 text-erciyes-red border border-erciyes-red/10'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Award className="w-4 h-4" /> Hakkında
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={cn(
              'flex-shrink-0 lg:w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left',
              activeTab === 'projects'
                ? 'bg-erciyes-red/10 text-erciyes-red border border-erciyes-red/10'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <FolderCode className="w-4 h-4" /> Projeler & Takımlar
          </button>
          <button
            onClick={() => setActiveTab('recruitments')}
            className={cn(
              'flex-shrink-0 lg:w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left',
              activeTab === 'recruitments'
                ? 'bg-erciyes-red/10 text-erciyes-red border border-erciyes-red/10'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Briefcase className="w-4 h-4" /> İlanlar (Ekip Arama)
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={cn(
              'flex-shrink-0 lg:w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left',
              activeTab === 'events'
                ? 'bg-erciyes-red/10 text-erciyes-red border border-erciyes-red/10'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Calendar className="w-4 h-4" /> Etkinlik Takvimi
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={cn(
              'flex-shrink-0 lg:w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left',
              activeTab === 'members'
                ? 'bg-erciyes-red/10 text-erciyes-red border border-erciyes-red/10'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Users className="w-4 h-4" /> Üyeler & Mezunlar
          </button>
        </div>

        {/* Sağ İçerik Kartı */}
        <div className="lg:col-span-9 bg-card border border-border p-6 rounded-3xl min-h-[50vh] shadow-xs">
          
          {/* TAB: HAKKINDA */}
          {activeTab === 'about' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Kulüp Vizyonu</h3>
                <p className="text-sm font-extrabold text-foreground mt-2 italic bg-secondary/10 p-4.5 rounded-2xl border border-border/60 leading-relaxed">
                  "{club.vision || 'Henüz bir vizyon sloganı belirlenmemiş.'}"
                </p>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Kulüp Hakkında</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mt-2 whitespace-pre-line">
                  {club.description || 'Bu kulüp hakkında henüz bir tanıtım yazısı eklenmemiş.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border/60 pt-6">
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Kurucu Üye</h4>
                  <p className="text-xs font-bold mt-1">@{club.founder?.username || 'Belirsiz'}</p>
                </div>
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Aktif Başkan</h4>
                  <p className="text-xs font-bold text-erciyes-red mt-1">
                    {club.president ? `@${club.president.username}` : 'Mevcut Değil'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB: PROJELER & TAKIMLAR */}
          {activeTab === 'projects' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Kulübün Projeleri</h3>
              </div>

              {projects.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-border rounded-2xl">
                  <FolderCode className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Kulübe ait aktif bir proje bulunmamaktadır.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projects.map((proj) => (
                    <div key={proj.id} className="p-5 border border-border/80 rounded-2xl bg-secondary/20 flex flex-col justify-between">
                      <div className="space-y-2">
                        <span className={cn(
                          "inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border",
                          proj.status === 'active' 
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                            : "bg-secondary text-muted-foreground border-border"
                        )}>
                          {proj.status === 'active' ? 'Aktif Proje' : 'Tamamlandı'}
                        </span>
                        <h4 className="font-extrabold text-sm text-foreground">{proj.title}</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                          {proj.description || 'Açıklama eklenmemiş.'}
                        </p>
                      </div>

                      {proj.leader && (
                        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/40">
                          {proj.leader.avatar_url ? (
                            <Image src={proj.leader.avatar_url} alt="Leader" width={20} height={20} className="rounded-full object-cover" />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center text-[8px] font-bold text-muted-foreground">
                              {proj.leader.username.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <span className="text-[10px] text-muted-foreground font-semibold">Proje Lideri: @{proj.leader.username}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: İLANLAR */}
          {activeTab === 'recruitments' && (
            <div className="space-y-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Açık Ekip İlanları</h3>

              {recruitments.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-border rounded-2xl">
                  <Briefcase className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Şu an aktif bir açık pozisyon ilanı bulunmuyor.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recruitments.map((rec) => (
                    <div key={rec.id} className="p-5 border border-border/80 rounded-2xl bg-secondary/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="space-y-1">
                        <h4 className="font-extrabold text-sm text-foreground">{rec.title}</h4>
                        <p className="text-xs text-muted-foreground">{rec.description}</p>
                        {rec.requirements.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {rec.requirements.map((req, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-card border border-border rounded-md text-[9px] font-semibold text-muted-foreground">
                                {req}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {isAuthenticated ? (
                        rec.my_application ? (
                          <span className={cn(
                            "px-4 py-2 rounded-xl text-[10px] font-bold border",
                            rec.my_application.status === 'accepted'
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                              : rec.my_application.status === 'rejected'
                              ? "bg-destructive/10 text-destructive border-destructive/20"
                              : "bg-secondary text-muted-foreground border-border"
                          )}>
                            {rec.my_application.status === 'accepted' ? 'Başvuru Kabul Edildi' : rec.my_application.status === 'rejected' ? 'Reddedildi' : 'Başvuruldu (Onay Bekliyor)'}
                          </span>
                        ) : (
                          <button
                            onClick={() => setActiveApplyRec(rec)}
                            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-bold transition-all shadow-xs"
                          >
                            Başvur
                          </button>
                        )
                      ) : (
                        <Link href="/giris-yap" className="px-4 py-2 rounded-xl bg-secondary text-xs font-bold">
                          Giriş Yap
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: ETKİNLİK TAKVİMİ */}
          {activeTab === 'events' && (
            <div className="space-y-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Etkinlik Takvimi</h3>

              {events.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-border rounded-2xl">
                  <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Planlanmış aktif bir etkinlik bulunmuyor.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {events.map((ev) => {
                    const eventDateObj = new Date(ev.event_date);
                    return (
                      <div key={ev.id} className="p-5 border border-border/80 rounded-2xl bg-secondary/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="space-y-1">
                          <h4 className="font-extrabold text-sm text-foreground">{ev.title}</h4>
                          <p className="text-xs text-muted-foreground">{ev.description}</p>
                          <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-muted-foreground font-semibold">
                            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {eventDateObj.toLocaleDateString('tr-TR')} {eventDateObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                            {ev.location && <span className="flex items-center gap-1">📍 {ev.location}</span>}
                            <span>👥 {ev.rsvp_yes_count} Katılımcı</span>
                          </div>
                        </div>

                        {/* LCV Butonları */}
                        <div className="flex items-center gap-1 bg-card border border-border p-1 rounded-xl">
                          <button
                            onClick={() => handleRsvpEvent(ev.id, 'yes')}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all",
                              ev.my_rsvp_status === 'yes' 
                                ? "bg-emerald-500 text-white shadow-xs" 
                                : "text-muted-foreground hover:bg-secondary"
                            )}
                          >
                            Katılıyorum
                          </button>
                          <button
                            onClick={() => handleRsvpEvent(ev.id, 'maybe')}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all",
                              ev.my_rsvp_status === 'maybe' 
                                ? "bg-amber-500 text-white shadow-xs" 
                                : "text-muted-foreground hover:bg-secondary"
                            )}
                          >
                            Belki
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB: ÜYELER & MEZUNLAR */}
          {activeTab === 'members' && (
            <div className="space-y-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Kulüp Üyeleri</h3>

              {members.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-border rounded-2xl">
                  <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Bu kulübün henüz resmi bir üyesi bulunmamaktadır.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Yönetim Kurulu / Liderler */}
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 border-b border-border/40 pb-1.5 mb-3">Yönetim & Liderler</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {members.filter(m => m.status === 'approved' && (m.role === 'president' || m.role === 'leader')).map((m) => (
                        <div key={m.id} className="flex items-center gap-3 p-3 bg-secondary/10 border border-border/60 rounded-2xl">
                          {m.user.avatar_url ? (
                            <Image src={m.user.avatar_url} alt={m.user.username} width={36} height={36} className="rounded-full object-cover" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center font-bold text-xs text-muted-foreground border border-border">
                              {m.user.username.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-foreground">@{m.user.username}</p>
                            <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                              {m.role === 'president' ? 'Kulüp Başkanı' : m.team_name || 'Yönetim Lideri'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Aktif Üyeler */}
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 border-b border-border/40 pb-1.5 mb-3">Aktif Üyeler</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {members.filter(m => m.status === 'approved' && m.role === 'member').map((m) => (
                        <div key={m.id} className="flex items-center gap-3 p-3 border border-border/40 rounded-2xl bg-secondary/5">
                          {m.user.avatar_url ? (
                            <Image src={m.user.avatar_url} alt={m.user.username} width={32} height={32} className="rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center font-bold text-xs text-muted-foreground border border-border">
                              {m.user.username.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-foreground">@{m.user.username}</p>
                            <p className="text-[9px] text-muted-foreground truncate">{m.team_name || 'Genel Üye'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ŞİKAYET MODALI */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Flag className="w-4.5 h-4.5 text-erciyes-red" /> Yönetim İhlali Bildir
              </h3>
              <button onClick={() => { setShowReportModal(false); setReportError(''); setReportSuccess(''); }} className="text-muted-foreground">✕</button>
            </div>

            {reportError && <div className="p-3 bg-destructive/10 text-destructive text-[11px] font-bold rounded-xl">{reportError}</div>}
            {reportSuccess && <div className="p-3 bg-emerald-500/10 text-emerald-500 text-[11px] font-bold rounded-xl">{reportSuccess}</div>}

            <form onSubmit={handleReportViolation} className="space-y-4">
              <p className="text-[11px] text-muted-foreground leading-normal">
                Kulüp yönetiminin veya başkanın resmi kurallara uymayan, uygunsuz veya etik dışı paylaşımlarını / eylemlerini kanıtlarıyla birlikte açıklayın.
              </p>
              <textarea
                value={reportDesc}
                onChange={(e) => setReportDesc(e.target.value)}
                placeholder="İhlal durumunu en az 10 karakter ile açıklayın..."
                rows={4}
                required
                className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-xs focus:outline-none focus:border-erciyes-red resize-none"
              />
              <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
                <button type="button" onClick={() => setShowReportModal(false)} className="px-4 py-2 rounded-xl text-xs font-bold">İptal</button>
                <button type="submit" disabled={isPending} className="px-4 py-2 rounded-xl bg-destructive text-white hover:bg-red-800 text-xs font-bold">Bildir</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* İLAN BAŞVURU MODALI */}
      {activeApplyRec && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-sm font-bold text-foreground">
                Başvuru: {activeApplyRec.title}
              </h3>
              <button onClick={() => { setActiveApplyRec(null); setApplyError(''); setApplySuccess(''); }} className="text-muted-foreground">✕</button>
            </div>

            {applyError && <div className="p-3 bg-destructive/10 text-destructive text-[11px] font-bold rounded-xl">{applyError}</div>}
            {applySuccess && <div className="p-3 bg-emerald-500/10 text-emerald-500 text-[11px] font-bold rounded-xl">{applySuccess}</div>}

            <form onSubmit={handleApplyRecruitment} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Ön yazı / Kendinizi Tanıtın
                </label>
                <textarea
                  value={applyLetter}
                  onChange={(e) => setApplyLetter(e.target.value)}
                  placeholder="Bu görev için neden uygun olduğunuzu ve yeteneklerinizi açıklayın..."
                  rows={4}
                  required
                  className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-xs focus:outline-none focus:border-erciyes-red resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
                <button type="button" onClick={() => setActiveApplyRec(null)} className="px-4 py-2 rounded-xl text-xs font-bold">Vazgeç</button>
                <button type="submit" disabled={isPending} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-bold">Başvuruyu Gönder</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
