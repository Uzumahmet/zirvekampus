'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/app/providers';
import {
  ArrowLeft, Shield, Users, FolderCode, Calendar, Briefcase,
  Settings, PlusCircle, Trash2, Check, X, Loader2,
  AlertTriangle, CheckCircle2, Building2, UserPlus,
  FileText, Crown, Edit3, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Member {
  id: string;
  user_id: string;
  role: string;
  team_name: string | null;
  team_id: string | null;
  status: string;
  created_at: string;
  user: { username: string; display_name: string | null; avatar_url: string | null; fakulte: string | null; };
}
interface Team {
  id: string;
  club_id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  leader_id: string | null;
  member_count: number;
  leader: { id: string; username: string; display_name: string | null; avatar_url: string | null; } | null;
}
interface Recruitment {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  is_active: boolean;
  applications?: Application[];
}
interface Application {
  id: string;
  recruitment_id: string;
  user_id: string;
  cover_letter: string | null;
  status: string;
  created_at: string;
  recruitmentTitle?: string;
  user?: { username: string; display_name: string | null; avatar_url: string | null; email: string; school_email: string | null; phone_number: string | null; fakulte: string | null; };
}
interface HandoverInfo {
  president_expired: boolean;
  handover: { id: string; candidate_id: string; expires_at: string; status: string; candidate: { username: string; display_name: string | null; avatar_url: string | null; }; } | null;
  approvals_count: number;
  approvals: string[];
  my_approved: boolean;
}
interface ClubInfo {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  vision: string | null;
  president_id: string | null;
  user_role: string | null;
  user_status: string | null;
}

type AdminTab = 'applications' | 'members' | 'teams' | 'add_project' | 'add_event' | 'add_recruitment' | 'settings';

export default function ClubAdminPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const router = useRouter();
  const { firebaseUser, dbUser, isAuthenticated, isLoading } = useAuth();
  const [isPending, startTransition] = useTransition();

  const [club, setClub] = useState<ClubInfo | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [recruitments, setRecruitments] = useState<Recruitment[]>([]);
  const [handoverInfo, setHandoverInfo] = useState<HandoverInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminTab, setAdminTab] = useState<AdminTab>('applications');
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Proje form
  const [newProjTitle, setNewProjTitle] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [newProjImg, setNewProjImg] = useState('');

  // Etkinlik form
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [newEventLoc, setNewEventLoc] = useState('');
  const [newEventDate, setNewEventDate] = useState('');

  // İlan form
  const [newRecTitle, setNewRecTitle] = useState('');
  const [newRecDesc, setNewRecDesc] = useState('');
  const [newRecReq, setNewRecReq] = useState('');

  // Takım form
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');
  const [newTeamLeaderId, setNewTeamLeaderId] = useState('');

  // Ayarlar form
  const [settingsDesc, setSettingsDesc] = useState('');
  const [settingsVision, setSettingsVision] = useState('');
  const [settingsLogo, setSettingsLogo] = useState('');

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${firebaseUser?.idToken}`,
  });

  const showMsg = (type: 'success' | 'error', text: string) => {
    setActionMsg({ type, text });
    setTimeout(() => setActionMsg(null), 3500);
  };

  const fetchData = async () => {
    try {
      const headers: Record<string, string> = {};
      if (firebaseUser?.idToken) headers['Authorization'] = `Bearer ${firebaseUser.idToken}`;

      const clubRes = await fetch(`/api/clubs/${slug}`, { headers });
      if (!clubRes.ok) { router.push(`/kulup/${slug}`); return; }
      const clubData = await clubRes.json();
      const clubInfo = clubData.club as ClubInfo;
      
      if (!clubInfo.user_role || (clubInfo.user_role !== 'president' && clubInfo.user_role !== 'leader')) {
        router.push(`/kulup/${slug}`);
        return;
      }
      setClub(clubInfo);
      setSettingsDesc(clubInfo.description || '');
      setSettingsVision(clubInfo.vision || '');
      setSettingsLogo(clubInfo.logo_url || '');

      const [membersRes, teamsRes, recRes, handoverRes] = await Promise.all([
        fetch(`/api/clubs/${slug}/members`, { headers }),
        fetch(`/api/clubs/${slug}/teams`, { headers }),
        fetch(`/api/clubs/${slug}/recruitments`, { headers }),
        fetch(`/api/clubs/${slug}/handover`, { headers }),
      ]);

      if (membersRes.ok) { const d = await membersRes.json(); setMembers(d.members || []); }
      if (teamsRes.ok) { const d = await teamsRes.json(); setTeams(d.teams || []); }
      if (recRes.ok) { const d = await recRes.json(); setRecruitments(d.recruitments || []); }
      if (handoverRes.ok) { const d = await handoverRes.json(); setHandoverInfo(d); }
    } catch (e) {
      console.error('Admin panel verisi yüklenemedi:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) { router.push('/giris-yap'); return; }
      fetchData();
    }
  }, [slug, isLoading, firebaseUser]);

  // ── ACTIONS ──
  const handleAppAction = async (appId: string, status: 'accepted' | 'rejected') => {
    startTransition(async () => {
      const res = await fetch(`/api/clubs/${slug}/recruitments`, {
        method: 'PUT', headers: getHeaders(),
        body: JSON.stringify({ applicationId: appId, status }),
      });
      if (res.ok) { fetchData(); showMsg('success', status === 'accepted' ? 'Başvuru kabul edildi!' : 'Başvuru reddedildi.'); }
      else { const d = await res.json(); showMsg('error', d.error || 'İşlem başarısız.'); }
    });
  };

  const handleMemberApprove = async (userId: string) => {
    startTransition(async () => {
      const res = await fetch(`/api/clubs/${slug}/members`, {
        method: 'PUT', headers: getHeaders(),
        body: JSON.stringify({ userId, role: 'member', status: 'approved' }),
      });
      if (res.ok) { fetchData(); showMsg('success', 'Üye onaylandı!'); }
      else { const d = await res.json(); showMsg('error', d.error || 'Hata.'); }
    });
  };

  const handleMemberRoleChange = async (userId: string, role: string, teamId?: string | null) => {
    startTransition(async () => {
      const body: any = { userId, role };
      if (teamId !== undefined) body.teamId = teamId;
      const res = await fetch(`/api/clubs/${slug}/members`, {
        method: 'PUT', headers: getHeaders(), body: JSON.stringify(body),
      });
      if (res.ok) fetchData();
      else { const d = await res.json(); showMsg('error', d.error || 'Güncelleme başarısız.'); }
    });
  };

  const handleKickMember = async (userId: string) => {
    if (!confirm('Bu üyeyi kulüpten çıkarmak istediğinize emin misiniz?')) return;
    const res = await fetch(`/api/clubs/${slug}/members?userId=${userId}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${firebaseUser?.idToken}` },
    });
    if (res.ok) { fetchData(); showMsg('success', 'Üye çıkarıldı.'); }
    else { const d = await res.json(); showMsg('error', d.error || 'Hata.'); }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await fetch(`/api/clubs/${slug}/teams`, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({ name: newTeamName, description: newTeamDesc, leaderId: newTeamLeaderId || undefined }),
      });
      const d = await res.json();
      if (res.ok) { fetchData(); setShowCreateTeam(false); setNewTeamName(''); setNewTeamDesc(''); setNewTeamLeaderId(''); showMsg('success', 'Takım oluşturuldu!'); }
      else showMsg('error', d.error || 'Takım oluşturulamadı.');
    });
  };

  const handleUpdateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam) return;
    startTransition(async () => {
      const res = await fetch(`/api/clubs/${slug}/teams`, {
        method: 'PUT', headers: getHeaders(),
        body: JSON.stringify({ teamId: editingTeam.id, name: newTeamName, description: newTeamDesc, leaderId: newTeamLeaderId || null }),
      });
      const d = await res.json();
      if (res.ok) { fetchData(); setEditingTeam(null); showMsg('success', 'Takım güncellendi!'); }
      else showMsg('error', d.error || 'Güncelleme başarısız.');
    });
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm('Bu takımı silmek istediğinize emin misiniz? Takımdaki üyeler genel üye olarak kalacak.')) return;
    const res = await fetch(`/api/clubs/${slug}/teams?teamId=${teamId}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${firebaseUser?.idToken}` },
    });
    if (res.ok) { fetchData(); showMsg('success', 'Takım silindi.'); }
    else { const d = await res.json(); showMsg('error', d.error || 'Hata.'); }
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await fetch(`/api/clubs/${slug}/projects`, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({ title: newProjTitle, description: newProjDesc, imageUrls: newProjImg ? [newProjImg] : [] }),
      });
      const d = await res.json();
      if (res.ok) { setNewProjTitle(''); setNewProjDesc(''); setNewProjImg(''); showMsg('success', 'Proje eklendi!'); }
      else showMsg('error', d.error || 'Proje eklenemedi.');
    });
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await fetch(`/api/clubs/${slug}/events`, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({ title: newEventTitle, description: newEventDesc, location: newEventLoc, eventDate: newEventDate }),
      });
      const d = await res.json();
      if (res.ok) { setNewEventTitle(''); setNewEventDesc(''); setNewEventLoc(''); setNewEventDate(''); showMsg('success', 'Etkinlik eklendi!'); }
      else showMsg('error', d.error || 'Etkinlik eklenemedi.');
    });
  };

  const handleAddRecruitment = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const reqs = newRecReq ? newRecReq.split(',').map(r => r.trim()).filter(Boolean) : [];
      const res = await fetch(`/api/clubs/${slug}/recruitments`, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({ title: newRecTitle, description: newRecDesc, requirements: reqs }),
      });
      const d = await res.json();
      if (res.ok) { setNewRecTitle(''); setNewRecDesc(''); setNewRecReq(''); showMsg('success', 'İlan yayına alındı!'); }
      else showMsg('error', d.error || 'İlan eklenemedi.');
    });
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await fetch(`/api/clubs/${slug}`, {
        method: 'PUT', headers: getHeaders(),
        body: JSON.stringify({ description: settingsDesc, vision: settingsVision, logoUrl: settingsLogo }),
      });
      const d = await res.json();
      if (res.ok) { showMsg('success', 'Kulüp bilgileri güncellendi!'); setClub(prev => prev ? { ...prev, ...d.club } : prev); }
      else showMsg('error', d.error || 'Güncelleme başarısız.');
    });
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-erciyes-red" />
          <p className="text-xs text-muted-foreground font-semibold">Yönetici paneli yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!club) return null;

  const isPresident = club.user_role === 'president';
  const pendingMembers = members.filter(m => m.status === 'pending');
  const approvedMembers = members.filter(m => m.status === 'approved');
  const allApplications = recruitments.flatMap(r =>
    (r.applications || []).map(app => ({ ...app, recruitmentTitle: r.title }))
  );
  const pendingApps = allApplications.filter(a => a.status === 'pending');
  const approvalCount = handoverInfo?.approvals_count ?? 0;
  const isFullyAuthorized = approvalCount >= 5;

  const sidebarTabs: { id: AdminTab; label: string; icon: React.ReactNode; badge?: number; presidentOnly?: boolean }[] = [
    { id: 'applications', label: 'Pozisyon Başvuruları', icon: <FileText className="w-4 h-4" />, badge: pendingApps.length },
    { id: 'members', label: 'Üye Yönetimi', icon: <Users className="w-4 h-4" />, badge: pendingMembers.length },
    ...(isPresident ? [{ id: 'teams' as AdminTab, label: 'Takım Yönetimi', icon: <Building2 className="w-4 h-4" />, presidentOnly: true }] : []),
    { id: 'add_project', label: 'Proje Ekle', icon: <FolderCode className="w-4 h-4 text-emerald-500" /> },
    { id: 'add_event', label: 'Etkinlik Ekle', icon: <Calendar className="w-4 h-4 text-cyan-500" /> },
    { id: 'add_recruitment', label: 'İlan Aç', icon: <Briefcase className="w-4 h-4 text-amber-500" /> },
    ...(isPresident ? [{ id: 'settings' as AdminTab, label: 'Kulüp Ayarları', icon: <Settings className="w-4 h-4" />, presidentOnly: true }] : []),
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* ─── STICKY TOP HEADER ─── */}
      <div className="sticky top-0 z-40 bg-card/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.push(`/kulup/${slug}`)}
          className="p-2 rounded-xl hover:bg-secondary transition-colors flex-shrink-0"
        >
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>

        {club.logo_url ? (
          <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-border flex-shrink-0">
            <Image src={club.logo_url} alt={club.name} fill className="object-cover" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-erciyes-red/10 flex items-center justify-center text-xs font-black text-erciyes-red border border-erciyes-red/20 flex-shrink-0">
            {club.name.slice(0, 2).toUpperCase()}
          </div>
        )}

        <div className="min-w-0">
          <p className="text-sm font-black text-foreground truncate">{club.name}</p>
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Shield className="w-3 h-3 text-erciyes-red" />
            Yönetici Paneli
          </p>
        </div>

        <div className="ml-auto flex-shrink-0">
          {isPresident && !isFullyAuthorized ? (
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <span className="text-[11px] font-bold text-amber-500 hidden sm:block">
                {approvalCount}/5 Onay
              </span>
            </div>
          ) : isPresident && isFullyAuthorized ? (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span className="text-[11px] font-bold text-emerald-500 hidden sm:block">Tam Yetkili</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-xl px-3 py-1.5">
              <Crown className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="text-[11px] font-bold text-primary hidden sm:block">Takım Lideri</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex" style={{ height: 'calc(100vh - 57px)' }}>
        {/* ─── LEFT SIDEBAR ─── */}
        <div className="w-60 border-r border-border bg-card/30 p-3 flex-col gap-1 overflow-y-auto flex-shrink-0 hidden md:flex">
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 px-3 pt-2 pb-1">YÖNETİM</p>

          {sidebarTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setAdminTab(tab.id)}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs font-bold transition-all',
                adminTab === tab.id
                  ? 'bg-erciyes-red/10 text-erciyes-red border border-erciyes-red/15 shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
              )}
            >
              {tab.icon}
              <span className="flex-1">{tab.label}</span>
              {tab.badge && tab.badge > 0 ? (
                <span className="px-1.5 py-0.5 rounded-full bg-erciyes-red text-white text-[9px] font-black min-w-[18px] text-center">
                  {tab.badge}
                </span>
              ) : null}
            </button>
          ))}

          {/* Presidential authority warning in sidebar */}
          {isPresident && !isFullyAuthorized && (
            <div className="mt-auto p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <p className="text-[10px] font-black text-amber-500 uppercase tracking-wider mb-1.5">⚠️ Tam Yetki Gerekli</p>
              <p className="text-[10px] text-amber-600/80 leading-relaxed">
                Hesabınızı {5 - approvalCount} daha onaylı üyeye onaylatmanız gerekiyor.
              </p>
              <div className="mt-2 flex items-center justify-between bg-card border border-border rounded-lg px-2 py-1.5">
                <span className="text-[9px] text-muted-foreground">Onay Durumu</span>
                <span className="text-xs font-black text-amber-500">{approvalCount}<span className="text-muted-foreground font-normal">/5</span></span>
              </div>
            </div>
          )}
        </div>

        {/* ─── MOBILE TABS ─── */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border px-2 py-2 flex gap-1 overflow-x-auto scrollbar-none">
          {sidebarTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setAdminTab(tab.id)}
              className={cn(
                'flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all',
                adminTab === tab.id ? 'bg-erciyes-red/10 text-erciyes-red' : 'text-muted-foreground'
              )}
            >
              {tab.icon}
              <span className="hidden xs:block">{tab.label.split(' ')[0]}</span>
              {tab.badge && tab.badge > 0 ? <span className="w-4 h-4 rounded-full bg-erciyes-red text-white text-[8px] font-black flex items-center justify-center">{tab.badge}</span> : null}
            </button>
          ))}
        </div>

        {/* ─── MAIN CONTENT ─── */}
        <div className="flex-1 overflow-y-auto pb-20 md:pb-6">
          <div className="p-4 sm:p-6 max-w-4xl mx-auto">

            {/* Action feedback */}
            {actionMsg && (
              <div className={cn(
                'mb-4 p-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200',
                actionMsg.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                  : 'bg-destructive/10 text-destructive border border-destructive/20'
              )}>
                {actionMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                {actionMsg.text}
              </div>
            )}

            {/* ─── TAB: BAŞVURULAR ─── */}
            {adminTab === 'applications' && (
              <div className="space-y-4">
                <h2 className="text-sm font-black text-foreground uppercase tracking-wider">Pozisyon Başvuruları</h2>
                {allApplications.length === 0 ? (
                  <div className="text-center py-16 border border-dashed border-border rounded-2xl">
                    <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Henüz bir pozisyon başvurusu yapılmamış.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {allApplications.map(app => (
                      <div key={app.id} className="p-4 border border-border rounded-2xl bg-card space-y-3">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex items-center gap-3">
                            {app.user?.avatar_url ? (
                              <Image src={app.user.avatar_url} alt="Applicant" width={36} height={36} className="rounded-full object-cover" />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center font-bold text-xs text-muted-foreground border border-border">
                                {app.user?.username?.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="text-xs font-bold text-foreground">@{app.user?.username}</p>
                              <p className="text-[9px] text-muted-foreground mt-0.5">Pozisyon: <span className="font-semibold">{app.recruitmentTitle}</span></p>
                              {app.user?.fakulte && <p className="text-[9px] text-muted-foreground">{app.user.fakulte}</p>}
                            </div>
                          </div>
                          <span className={cn(
                            'px-2 py-0.5 rounded-full text-[9px] font-bold border flex-shrink-0',
                            app.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                              : app.status === 'rejected' ? 'bg-destructive/10 text-destructive border-destructive/20'
                                : 'bg-secondary text-muted-foreground border-border'
                          )}>
                            {app.status === 'accepted' ? 'Kabul Edildi' : app.status === 'rejected' ? 'Reddedildi' : 'Beklemede'}
                          </span>
                        </div>
                        {app.cover_letter && (
                          <p className="text-xs text-muted-foreground bg-secondary/30 border border-border/60 p-3 rounded-xl italic leading-relaxed">
                            "{app.cover_letter}"
                          </p>
                        )}
                        {app.status === 'pending' && (
                          <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
                            <button onClick={() => handleAppAction(app.id, 'rejected')} disabled={isPending}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-destructive/20 hover:bg-destructive/10 text-destructive text-[10px] font-bold transition-all">
                              <X className="w-3.5 h-3.5" /> Reddet
                            </button>
                            <button onClick={() => handleAppAction(app.id, 'accepted')} disabled={isPending}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold transition-all shadow-xs">
                              <Check className="w-3.5 h-3.5" /> Onayla
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ─── TAB: ÜYELER ─── */}
            {adminTab === 'members' && (
              <div className="space-y-6">
                <h2 className="text-sm font-black text-foreground uppercase tracking-wider">Üye Yönetimi</h2>

                {/* Bekleyen Üyeler */}
                {pendingMembers.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-amber-500">
                      ⏳ Onay Bekleyen Üyeler ({pendingMembers.length})
                    </h3>
                    {pendingMembers.map(mem => (
                      <div key={mem.id} className="p-4 border border-amber-500/20 rounded-2xl bg-amber-500/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="flex items-center gap-3">
                          {mem.user.avatar_url ? (
                            <Image src={mem.user.avatar_url} alt={mem.user.username} width={36} height={36} className="rounded-full object-cover" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center font-bold text-xs text-muted-foreground border border-border">
                              {mem.user.username.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="text-xs font-bold text-foreground">@{mem.user.username}</p>
                            {mem.user.display_name && <p className="text-[10px] text-muted-foreground">{mem.user.display_name}</p>}
                            {mem.user.fakulte && <p className="text-[9px] text-muted-foreground/70">{mem.user.fakulte}</p>}
                          </div>
                        </div>
                        <button onClick={() => handleMemberApprove(mem.user_id)} disabled={isPending}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold transition-all shadow-xs">
                          <UserPlus className="w-3.5 h-3.5" /> Katılımı Onayla
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Onaylı Üyeler */}
                <div className="space-y-3">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
                    Aktif Üyeler ({approvedMembers.length})
                  </h3>
                  {approvedMembers.length === 0 ? (
                    <div className="text-center py-10 border border-dashed border-border rounded-2xl">
                      <p className="text-xs text-muted-foreground">Henüz onaylı üye bulunmuyor.</p>
                    </div>
                  ) : (
                    approvedMembers.map(mem => (
                      <div key={mem.id} className="p-4 border border-border rounded-2xl bg-card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="flex items-center gap-3">
                          {mem.user.avatar_url ? (
                            <Image src={mem.user.avatar_url} alt={mem.user.username} width={32} height={32} className="rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center font-bold text-xs text-muted-foreground border border-border">
                              {mem.user.username.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="text-xs font-bold text-foreground">@{mem.user.username}</p>
                            <p className="text-[9px] text-muted-foreground">{mem.team_name || 'Genel Üye'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {isPresident && mem.role !== 'president' && (
                            <>
                              <select value={mem.role} onChange={e => handleMemberRoleChange(mem.user_id, e.target.value)}
                                className="px-2.5 py-1.5 rounded-xl border border-border bg-secondary text-[10px] font-bold focus:outline-none focus:border-erciyes-red">
                                <option value="member">Genel Üye</option>
                                <option value="leader">Takım Lideri</option>
                                <option value="alumni">Mezun</option>
                              </select>
                              <button onClick={() => handleKickMember(mem.user_id)}
                                className="p-1.5 rounded-lg border border-destructive/20 hover:bg-destructive/10 text-destructive transition-all"
                                title="Kulüpten Çıkar">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          {mem.role === 'president' && (
                            <span className="px-2.5 py-1 rounded-xl bg-erciyes-red/10 text-erciyes-red text-[10px] font-bold border border-erciyes-red/20">
                              Başkan
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ─── TAB: TAKIMLAR ─── */}
            {adminTab === 'teams' && isPresident && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-black text-foreground uppercase tracking-wider">Takım Yönetimi</h2>
                  {!showCreateTeam && !editingTeam && (
                    <button onClick={() => setShowCreateTeam(true)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-erciyes-red text-white hover:bg-red-800 text-xs font-bold transition-all shadow-xs">
                      <PlusCircle className="w-4 h-4" /> Takım Oluştur
                    </button>
                  )}
                </div>

                {/* Takım Oluşturma Formu */}
                {(showCreateTeam || editingTeam) && (
                  <form onSubmit={editingTeam ? handleUpdateTeam : handleCreateTeam}
                    className="p-5 border-2 border-erciyes-red/20 rounded-2xl bg-erciyes-red/5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <h3 className="text-xs font-black text-foreground">
                      {editingTeam ? `"${editingTeam.name}" Takımını Düzenle` : 'Yeni Takım Oluştur'}
                    </h3>
                    <div>
                      <label className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Takım Adı *</label>
                      <input required type="text" value={newTeamName} onChange={e => setNewTeamName(e.target.value)}
                        placeholder="Örn: Yazılım Takımı, Tasarım Ekibi..."
                        className="w-full px-3 py-2 rounded-xl bg-card border border-border text-xs focus:outline-none focus:border-erciyes-red" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Takım Açıklaması</label>
                      <textarea value={newTeamDesc} onChange={e => setNewTeamDesc(e.target.value)} rows={2}
                        placeholder="Bu takımın görevi ve sorumlulukları..."
                        className="w-full px-3 py-2 rounded-xl bg-card border border-border text-xs focus:outline-none focus:border-erciyes-red resize-none" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Takım Lideri (Opsiyonel)</label>
                      <select value={newTeamLeaderId} onChange={e => setNewTeamLeaderId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-card border border-border text-xs focus:outline-none focus:border-erciyes-red">
                        <option value="">— Lider Seç —</option>
                        {approvedMembers.filter(m => m.role !== 'president').map(m => (
                          <option key={m.user_id} value={m.user_id}>@{m.user.username} {m.user.display_name ? `(${m.user.display_name})` : ''}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button type="button" onClick={() => { setShowCreateTeam(false); setEditingTeam(null); setNewTeamName(''); setNewTeamDesc(''); setNewTeamLeaderId(''); }}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:bg-secondary">İptal</button>
                      <button type="submit" disabled={isPending}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-erciyes-red text-white hover:bg-red-800 text-xs font-bold transition-all">
                        {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        {editingTeam ? 'Güncelle' : 'Oluştur'}
                      </button>
                    </div>
                  </form>
                )}

                {/* Takım Listesi */}
                {teams.length === 0 && !showCreateTeam ? (
                  <div className="text-center py-16 border border-dashed border-border rounded-2xl">
                    <Building2 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground mb-3">Henüz bir takım oluşturulmamış.</p>
                    <button onClick={() => setShowCreateTeam(true)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-erciyes-red text-white text-xs font-bold mx-auto">
                      <PlusCircle className="w-4 h-4" /> İlk Takımı Oluştur
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {teams.map(team => (
                      <div key={team.id} className="p-5 border border-border rounded-2xl bg-card space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-extrabold text-sm text-foreground">{team.name}</h4>
                            {team.description && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{team.description}</p>}
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <button onClick={() => { setEditingTeam(team); setNewTeamName(team.name); setNewTeamDesc(team.description || ''); setNewTeamLeaderId(team.leader_id || ''); setShowCreateTeam(false); }}
                              className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-all">
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDeleteTeam(team.id)}
                              className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-all">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/50 pt-2.5">
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" /> {team.member_count} Üye
                          </span>
                          {team.leader ? (
                            <span className="flex items-center gap-1 font-semibold">
                              <Crown className="w-3 h-3 text-amber-500" />
                              @{team.leader.username}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/60">Lider atanmamış</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ─── TAB: PROJE EKLE ─── */}
            {adminTab === 'add_project' && (
              <form onSubmit={handleAddProject} className="space-y-4 max-w-md">
                <h2 className="text-sm font-black text-foreground uppercase tracking-wider">Yeni Proje Tanımlayın</h2>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Proje İsmi *</label>
                  <input required type="text" value={newProjTitle} onChange={e => setNewProjTitle(e.target.value)}
                    placeholder="Örn: Akıllı Kampüs Mobil Uygulaması"
                    className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-xs focus:outline-none focus:border-erciyes-red" />
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Proje Açıklaması</label>
                  <textarea value={newProjDesc} onChange={e => setNewProjDesc(e.target.value)} rows={4}
                    placeholder="Projenin amacı, teknolojileri ve ekibi..."
                    className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-xs focus:outline-none focus:border-erciyes-red resize-none" />
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Görsel URL (İsteğe Bağlı)</label>
                  <input type="url" value={newProjImg} onChange={e => setNewProjImg(e.target.value)}
                    placeholder="https://example.com/project.jpg"
                    className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-xs focus:outline-none focus:border-erciyes-red" />
                </div>
                <button type="submit" disabled={isPending}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-erciyes-red text-white hover:bg-red-800 text-xs font-bold transition-all shadow-md shadow-erciyes-red/10">
                  {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderCode className="w-3.5 h-3.5" />}
                  Proje Ekle
                </button>
              </form>
            )}

            {/* ─── TAB: ETKİNLİK EKLE ─── */}
            {adminTab === 'add_event' && (
              <form onSubmit={handleAddEvent} className="space-y-4 max-w-md">
                <h2 className="text-sm font-black text-foreground uppercase tracking-wider">Takvime Etkinlik Ekleyin</h2>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Etkinlik Başlığı *</label>
                  <input required type="text" value={newEventTitle} onChange={e => setNewEventTitle(e.target.value)}
                    placeholder="Örn: Yapay Zeka Semineri"
                    className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-xs focus:outline-none focus:border-erciyes-red" />
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Etkinlik Açıklaması</label>
                  <textarea value={newEventDesc} onChange={e => setNewEventDesc(e.target.value)} rows={3}
                    placeholder="Seminer konuları, konuşmacılar..."
                    className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-xs focus:outline-none focus:border-erciyes-red resize-none" />
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Etkinlik Yeri / Konumu</label>
                  <input type="text" value={newEventLoc} onChange={e => setNewEventLoc(e.target.value)}
                    placeholder="Örn: Mühendislik Fakültesi Konferans Salonu"
                    className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-xs focus:outline-none focus:border-erciyes-red" />
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Etkinlik Tarihi ve Saati *</label>
                  <input required type="datetime-local" value={newEventDate} onChange={e => setNewEventDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-xs focus:outline-none focus:border-erciyes-red text-muted-foreground" />
                </div>
                <button type="submit" disabled={isPending}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-erciyes-red text-white hover:bg-red-800 text-xs font-bold transition-all shadow-md shadow-erciyes-red/10">
                  {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Calendar className="w-3.5 h-3.5" />}
                  Etkinlik Ekle
                </button>
              </form>
            )}

            {/* ─── TAB: İLAN AÇ ─── */}
            {adminTab === 'add_recruitment' && (
              <form onSubmit={handleAddRecruitment} className="space-y-4 max-w-md">
                <h2 className="text-sm font-black text-foreground uppercase tracking-wider">Açık Pozisyon İlanı Yayınlayın</h2>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Pozisyon Başlığı *</label>
                  <input required type="text" value={newRecTitle} onChange={e => setNewRecTitle(e.target.value)}
                    placeholder="Örn: Yazılım Ekip Üyesi (React)"
                    className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-xs focus:outline-none focus:border-erciyes-red" />
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Görev Tanımı *</label>
                  <textarea required value={newRecDesc} onChange={e => setNewRecDesc(e.target.value)} rows={4}
                    placeholder="Üstleneceği görevler ve sorumluluklar..."
                    className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-xs focus:outline-none focus:border-erciyes-red resize-none" />
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Gereksinimler (Virgülle Ayırın)</label>
                  <input type="text" value={newRecReq} onChange={e => setNewRecReq(e.target.value)}
                    placeholder="React, CSS, Git, Takım Çalışması"
                    className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-xs focus:outline-none focus:border-erciyes-red" />
                </div>
                <button type="submit" disabled={isPending}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-erciyes-red text-white hover:bg-red-800 text-xs font-bold transition-all shadow-md shadow-erciyes-red/10">
                  {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Briefcase className="w-3.5 h-3.5" />}
                  İlanı Yayınla
                </button>
              </form>
            )}

            {/* ─── TAB: KULÜP AYARLARI ─── */}
            {adminTab === 'settings' && isPresident && (
              <form onSubmit={handleSaveSettings} className="space-y-5 max-w-md">
                <h2 className="text-sm font-black text-foreground uppercase tracking-wider">Kulüp Bilgileri</h2>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Kulüp Vizyonu / Sloganı</label>
                  <input type="text" value={settingsVision} onChange={e => setSettingsVision(e.target.value)}
                    placeholder="Örn: Geleceği Birlikte İnşa Ediyoruz"
                    className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-xs focus:outline-none focus:border-erciyes-red" />
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Kulüp Açıklaması</label>
                  <textarea value={settingsDesc} onChange={e => setSettingsDesc(e.target.value)} rows={5}
                    placeholder="Kulübünüzü tanıtın..."
                    className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-xs focus:outline-none focus:border-erciyes-red resize-none" />
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Logo URL</label>
                  <input type="url" value={settingsLogo} onChange={e => setSettingsLogo(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-xs focus:outline-none focus:border-erciyes-red" />
                  {settingsLogo && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-border">
                        <Image src={settingsLogo} alt="Logo Preview" fill className="object-cover" />
                      </div>
                      <span className="text-[10px] text-muted-foreground">Önizleme</span>
                    </div>
                  )}
                </div>
                <button type="submit" disabled={isPending}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-erciyes-red text-white hover:bg-red-800 text-xs font-bold transition-all shadow-md shadow-erciyes-red/10">
                  {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Değişiklikleri Kaydet
                </button>
              </form>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
