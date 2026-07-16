'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers';
import {
  Users,
  ShieldAlert,
  Loader2,
  Check,
  X,
  FileCheck,
  Search,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

export default function AdminPaneliPage() {
  const router = useRouter();
  const { firebaseUser, dbUser, isLoading, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<'basvurular' | 'kullanicilar'>('basvurular');

  // Data states
  const [applications, setApplications] = useState<any[]>([]);
  const [appsLoading, setAppsLoading] = useState(true);
  
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  
  // UI states
  const [expandedAppId, setExpandedAppId] = useState<string | null>(null);
  const [reviewerNotes, setReviewerNotes] = useState<Record<string, string>>({});

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Access Control
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || !dbUser) {
      router.replace('/giris-yap');
      return;
    }
    const isAdminOrEditor = ['editor', 'admin'].includes(dbUser.role);
    if (!isAdminOrEditor) {
      router.replace('/');
      return;
    }
  }, [dbUser, isAuthenticated, isLoading, router]);

  // Fetch Applications
  const fetchApplications = async () => {
    if (!firebaseUser) return;
    setAppsLoading(true);
    try {
      const res = await fetch('/api/admin/applications', {
        headers: { Authorization: `Bearer ${firebaseUser.idToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setApplications(data.applications || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAppsLoading(false);
    }
  };

  // Fetch Users
  const fetchUsers = async () => {
    if (!firebaseUser) return;
    setUsersLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${firebaseUser.idToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (firebaseUser) {
      if (activeTab === 'basvurular') {
        fetchApplications();
      } else {
        fetchUsers();
      }
    }
  }, [firebaseUser, activeTab]);

  const handleApplicationAction = async (appId: string, status: 'approved' | 'rejected') => {
    const notes = reviewerNotes[appId] || '';
    setError('');
    setSuccess('');

    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/applications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${firebaseUser?.idToken}`
          },
          body: JSON.stringify({
            applicationId: appId,
            status,
            reviewNotes: notes
          })
        });

        if (res.ok) {
          setSuccess(status === 'approved' ? 'Başvuru onaylandı!' : 'Başvuru reddedildi.');
          fetchApplications();
        } else {
          const data = await res.json();
          setError(data.error || 'İşlem gerçekleştirilemedi.');
        }
      } catch (err) {
        setError('Bağlantı hatası oluştu.');
      }
    });
  };

  const handleRoleChange = async (targetUserId: string, newRole: string) => {
    if (!confirm(`Kullanıcının rolünü "${newRole}" olarak güncellemek istediğinize emin misiniz?`)) return;
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${firebaseUser?.idToken}`
        },
        body: JSON.stringify({
          targetUserId,
          newRole
        })
      });

      if (res.ok) {
        setSuccess('Kullanıcı rolü başarıyla güncellendi!');
        fetchUsers();
      } else {
        const data = await res.json();
        setError(data.error || 'Rol güncellenemedi.');
      }
    } catch (err) {
      setError('Bağlantı hatası.');
    }
  };

  const handleShowAsWriterChange = async (targetUserId: string, showAsWriter: boolean) => {
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${firebaseUser?.idToken}`
        },
        body: JSON.stringify({
          targetUserId,
          showAsWriter
        })
      });

      if (res.ok) {
        setSuccess('Yazar görünürlük ayarı başarıyla güncellendi!');
        fetchUsers();
      } else {
        const data = await res.json();
        setError(data.error || 'Ayar güncellenemedi.');
      }
    } catch (err) {
      setError('Bağlantı hatası.');
    }
  };

  // Filter users based on search
  const filteredUsers = users.filter((u) => {
    const query = searchQuery.toLowerCase();
    return (
      (u.username?.toLowerCase() || '').includes(query) ||
      (u.display_name?.toLowerCase() || '').includes(query) ||
      (u.email?.toLowerCase() || '').includes(query) ||
      (u.fakulte?.toLowerCase() || '').includes(query)
    );
  });

  if (isLoading || !dbUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-erciyes-red" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Üst Kısım */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-border/80 mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            Yönetici & Editör Paneli <span className="text-purple-400">🛡️</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Yazar başvurularını onaylayın ve kullanıcı rolleri ile izinlerini yönetin.
          </p>
        </div>

        {/* Sekmeler */}
        <div className="flex gap-1.5 p-1 bg-secondary rounded-xl w-fit border border-border/60">
          <button
            onClick={() => setActiveTab('basvurular')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'basvurular'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5" />
            Yazar Başvuruları ({applications.filter((a) => a.status === 'pending').length})
          </button>
          <button
            onClick={() => setActiveTab('kullanicilar')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'kullanicilar'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Kullanıcı Yönetimi
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 mb-6 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 mb-6 rounded-xl bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-xs font-semibold">
          {success}
        </div>
      )}

      <div>
        
        {/* ─── YAZAR BAŞVURULARI TAB ───────────────────────── */}
        {activeTab === 'basvurular' && (
          <div className="space-y-4">
            {appsLoading ? (
              <div className="py-20 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-erciyes-red" />
              </div>
            ) : applications.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-border rounded-3xl">
                <FileCheck className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Şu anda bekleyen hiçbir yazar başvurusu yok.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map((app) => {
                  const isExpanded = expandedAppId === app.id;
                  const isPendingApp = app.status === 'pending';
                  const userDetails = app.user || {};
                  const displayName = userDetails.display_name ?? userDetails.username ?? 'Öğrenci';
                  
                  return (
                    <div
                      key={app.id}
                      className={`bg-card border rounded-2xl overflow-hidden transition-all duration-200 ${
                        isExpanded ? 'border-border shadow-md' : 'border-border/60'
                      }`}
                    >
                      {/* Başlık Kart Bilgisi */}
                      <div className="p-4 sm:p-5 flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center font-bold text-xs border border-border">
                            {displayName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-bold text-sm text-foreground leading-tight">
                              {displayName} <span className="text-xs text-muted-foreground">@{userDetails.username}</span>
                            </h3>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {userDetails.email} • Başvuru: {new Date(app.created_at).toLocaleDateString('tr-TR')}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                            app.status === 'approved'
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                              : app.status === 'rejected'
                              ? 'bg-destructive/10 text-destructive border-destructive/20'
                              : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                          }`}>
                            {app.status === 'approved' ? 'Onaylandı' : app.status === 'rejected' ? 'Reddedildi' : 'Bekliyor'}
                          </span>

                          <button
                            onClick={() => setExpandedAppId(isExpanded ? null : app.id)}
                            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Genişletilmiş Detay Panel */}
                      {isExpanded && (
                        <div className="p-5 border-t border-border bg-secondary/5 space-y-5">
                          <div>
                            <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground mb-1.5">Neden Yazar Olmak İstiyor?</p>
                            <div className="p-3 bg-secondary/40 border border-border/40 rounded-xl text-xs leading-relaxed text-foreground whitespace-pre-wrap">
                              {app.reason}
                            </div>
                          </div>

                          <div>
                            <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground mb-1.5">Örnek Yazı İçeriği</p>
                            <div className="p-3 bg-secondary/40 border border-border/40 rounded-xl text-xs leading-relaxed text-foreground whitespace-pre-wrap max-h-60 overflow-y-auto">
                              {app.sample_writing}
                            </div>
                          </div>

                          {/* İnceleme / Karar Paneli */}
                          {isPendingApp && (
                            <div className="pt-4 border-t border-border space-y-4">
                              <div className="space-y-1.5">
                                <label className="block text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">İnceleme Notları (Gerekçe - Opsiyonel)</label>
                                <textarea
                                  value={reviewerNotes[app.id] || ''}
                                  onChange={(e) => setReviewerNotes({ ...reviewerNotes, [app.id]: e.target.value })}
                                  placeholder="Başvuruyu onaylama veya reddetme gerekçenizi buraya not edebilirsiniz..."
                                  rows={2}
                                  className="w-full px-3 py-2 rounded-xl bg-secondary border border-border/80 text-xs placeholder:text-muted-foreground focus:outline-none focus:border-erciyes-red transition-all"
                                />
                              </div>

                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={() => handleApplicationAction(app.id, 'rejected')}
                                  disabled={isPending}
                                  className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-destructive/20 hover:bg-destructive/10 text-destructive text-xs font-bold transition-all"
                                >
                                  <X className="w-3.5 h-3.5" /> Reddet
                                </button>
                                <button
                                  onClick={() => handleApplicationAction(app.id, 'approved')}
                                  disabled={isPending}
                                  className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-erciyes-red text-white text-xs font-bold hover:bg-red-700 transition-colors shadow-sm"
                                >
                                  <Check className="w-3.5 h-3.5" /> Onayla (Rolü Yazar Yap)
                                </button>
                              </div>
                            </div>
                          )}

                          {app.review_notes && !isPendingApp && (
                            <div className="p-3 bg-purple-500/5 border border-purple-500/10 rounded-xl text-xs leading-relaxed">
                              <span className="font-extrabold text-purple-400">İnceleme Notu:</span> {app.review_notes}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── KULLANICI YÖNETİMİ TAB ───────────────────────── */}
        {activeTab === 'kullanicilar' && (
          <div className="space-y-4">
            {/* Arama Barı */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Kullanıcı adı, e-posta veya fakülte bilgisine göre ara..."
                className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:border-erciyes-red transition-all"
              />
            </div>

            {usersLoading ? (
              <div className="py-20 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-erciyes-red" />
              </div>
            ) : (
              <div className="bg-card border border-border rounded-2xl overflow-hidden overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                      <th className="px-5 py-4">Kullanıcı</th>
                      <th className="px-5 py-4">E-Posta</th>
                      <th className="px-5 py-4">Fakülte</th>
                      <th className="px-5 py-4">Mevcut Rol</th>
                      <th className="px-5 py-4 text-center">Yazar Olarak Göster</th>
                      {dbUser.role === 'admin' && <th className="px-5 py-4 text-right">Rol Değiştir</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => {
                      const displayName = u.display_name ?? u.username ?? 'Öğrenci';
                      return (
                        <tr key={u.id} className="border-b border-border hover:bg-secondary/10 transition-colors text-xs">
                          <td className="px-5 py-4">
                            <div className="font-bold text-foreground">{displayName}</div>
                            <div className="text-[10px] text-muted-foreground">@{u.username}</div>
                          </td>
                          <td className="px-5 py-4 text-muted-foreground">{u.email}</td>
                          <td className="px-5 py-4 text-muted-foreground">{u.fakulte || 'Belirtilmemiş'}</td>
                          <td className="px-5 py-4">
                            <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                              u.role === 'admin'
                                ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                : u.role === 'editor'
                                ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                : u.role === 'yazar'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-secondary text-muted-foreground border-border'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center">
                            {['admin', 'editor'].includes(u.role) ? (
                              <input
                                type="checkbox"
                                checked={u.show_as_writer === true}
                                onChange={(e) => handleShowAsWriterChange(u.id, e.target.checked)}
                                className="w-4 h-4 rounded border-border text-erciyes-red focus:ring-erciyes-red/40 bg-secondary cursor-pointer"
                              />
                            ) : (
                              <span className="text-[10px] text-muted-foreground/60 italic">
                                {u.role === 'yazar' ? 'Evet (Yazar)' : 'Hayır'}
                              </span>
                            )}
                          </td>
                          {dbUser.role === 'admin' && (
                            <td className="px-5 py-4 text-right">
                              {u.id !== dbUser.id ? (
                                <select
                                  value={u.role}
                                  onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                  className="px-2 py-1.5 rounded-lg bg-secondary border border-border text-xs text-foreground focus:outline-none focus:border-erciyes-red transition-all cursor-pointer font-semibold"
                                >
                                  <option value="kullanici">Kullanıcı</option>
                                  <option value="yazar">Yazar</option>
                                  <option value="editor">Editör</option>
                                  <option value="admin">Admin</option>
                                </select>
                              ) : (
                                <span className="text-[10px] text-muted-foreground italic">Aktif Admin</span>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
