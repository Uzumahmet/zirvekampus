'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers';
import { auth } from '@/lib/firebase/clientApp';
import {
  signInWithCustomToken,
  updatePassword,
  sendPasswordResetEmail,
  deleteUser
} from 'firebase/auth';
import {
  Loader2, KeyRound, UserMinus, UserPlus, Trash2, Key, AlertTriangle, Check, ShieldCheck, Mail, ShieldAlert
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface Account {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string;
}

export default function HesaplarMerkezi() {
  const router = useRouter();
  const { firebaseUser, dbUser, isLoading, isAuthenticated } = useAuth();
  const [isPending, startTransition] = useTransition();

  // Bağlı hesaplar listesi
  const [linkedAccounts, setLinkedAccounts] = useState<Account[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  // Şifre Formu Eyaletleri
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<{ success?: string; error?: string }>({});

  // Hesap Bağlama Formu Eyaletleri
  const [linkUsername, setLinkUsername] = useState('');
  const [linkPassword, setLinkPassword] = useState('');
  const [linkStatus, setLinkStatus] = useState<{ success?: string; error?: string }>({});
  const [showLinkModal, setShowLinkModal] = useState(false);

  // Hesap Silme Onay Eyaleti
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Sayfa yüklendiğinde bağlı hesapları çek
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/giris-yap');
      return;
    }

    if (isAuthenticated && firebaseUser) {
      fetchLinkedAccounts();
    }
  }, [isLoading, isAuthenticated, firebaseUser, router]);

  const fetchLinkedAccounts = async () => {
    try {
      const res = await fetch('/api/auth/switch', {
        headers: { Authorization: `Bearer ${firebaseUser?.idToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLinkedAccounts(data.accounts ?? []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAccounts(false);
    }
  };

  // Hesaplar Arası Şifresiz Hızlı Geçiş
  const handleSwitchAccount = async (targetUid: string) => {
    startTransition(async () => {
      try {
        const res = await fetch('/api/auth/switch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${firebaseUser?.idToken}`,
          },
          body: JSON.stringify({ targetUid }),
        });

        const json = await res.json();
        if (!res.ok) {
          alert(json.error || 'Hesap değiştirilemedi.');
          return;
        }

        // Custom Token ile Firebase'de oturum aç
        await signInWithCustomToken(auth, json.customToken);
        
        // Başarıyla oturum değişti, anasayfaya yönlendir ve yenile
        window.location.href = '/';
      } catch (err) {
        console.error(err);
        alert('Hesap değiştirilirken bir hata oluştu.');
      }
    });
  };

  // Hesap Bağlama (Link) İşlemi
  const handleLinkAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinkStatus({});

    if (!linkUsername || !linkPassword) {
      setLinkStatus({ error: 'Kullanıcı adı ve şifre gereklidir.' });
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/auth/link', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${firebaseUser?.idToken}`,
          },
          body: JSON.stringify({
            action: 'link',
            targetUsername: linkUsername,
            targetPassword: linkPassword,
          }),
        });

        const json = await res.json();
        if (res.ok) {
          setLinkStatus({ success: 'Hesap başarıyla bağlandı!' });
          setLinkUsername('');
          setLinkPassword('');
          setShowLinkModal(false);
          fetchLinkedAccounts(); // Listeyi güncelle
        } else {
          setLinkStatus({ error: json.error || 'Bağlantı kurulamadı.' });
        }
      } catch {
        setLinkStatus({ error: 'Bir sunucu hatası oluştu.' });
      }
    });
  };

  // Hesap Bağlantısını Kesme (Unlink)
  const handleUnlinkAccount = async (targetUid: string) => {
    if (!confirm('Bu hesabın bağlantısını kesmek istediğinize emin misiniz? Hızlı geçiş listesinden çıkarılacaktır.')) return;

    try {
      const res = await fetch('/api/auth/link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${firebaseUser?.idToken}`,
        },
        body: JSON.stringify({
          action: 'unlink',
          targetUid,
        }),
      });

      if (res.ok) {
        fetchLinkedAccounts(); // Listeyi yenile
      } else {
        const json = await res.json();
        alert(json.error || 'Bağlantı kesilemedi.');
      }
    } catch {
      alert('İstek gönderilirken hata oluştu.');
    }
  };

  // Şifre Değiştirme
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus({});

    if (newPass.length < 6) {
      setPasswordStatus({ error: 'Yeni şifre en az 6 karakter olmalıdır.' });
      return;
    }

    if (newPass !== confirmPass) {
      setPasswordStatus({ error: 'Şifreler uyuşmuyor.' });
      return;
    }

    startTransition(async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          await updatePassword(user, newPass);
          setPasswordStatus({ success: 'Şifreniz başarıyla güncellendi!' });
          setNewPass('');
          setConfirmPass('');
        } else {
          setPasswordStatus({ error: 'Oturum bulunamadı. Lütfen tekrar giriş yapın.' });
        }
      } catch (err: any) {
        if (err.code === 'auth/requires-recent-login') {
          setPasswordStatus({
            error: 'Güvenlik nedeniyle şifre değiştirmek için yakın zamanda giriş yapmış olmanız gerekir. Lütfen çıkış yapıp tekrar girin.',
          });
        } else {
          setPasswordStatus({ error: 'Şifre güncellenemedi. Lütfen tekrar deneyin.' });
        }
      }
    });
  };

  // Şifre Sıfırlama E-postası Gönderme
  const handleSendResetEmail = async () => {
    if (!firebaseUser?.email) return;
    try {
      await sendPasswordResetEmail(auth, firebaseUser.email);
      alert('Şifre sıfırlama e-postası başarıyla gönderildi.');
    } catch {
      alert('Sıfırlama e-postası gönderilemedi.');
    }
  };

  // Hesabı Kalıcı Olarak Silme
  const handleDeleteAccount = async () => {
    setDeleteError('');
    startTransition(async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        // 1. Backend veritabanından kullanıcı verilerini temizle
        const res = await fetch('/api/user/delete', {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${firebaseUser?.idToken}` },
        });

        if (!res.ok) {
          const json = await res.json();
          setDeleteError(json.error || 'Veritabanı kaydı silinemedi.');
          return;
        }

        // 2. Firebase Authentication kullanıcısını sil
        await deleteUser(user);

        // Anasayfaya at ve oturumu sonlandır
        window.location.href = '/';
      } catch (err: any) {
        console.error(err);
        if (err.code === 'auth/requires-recent-login') {
          setDeleteError(
            'Kritik güvenlik işlemi! Hesabınızı silebilmek için yakın zamanda tekrar giriş yapmış olmanız gerekir. Lütfen çıkış yapıp tekrar giriş yapın.'
          );
        } else {
          setDeleteError('Hesap silinemedi. Lütfen daha sonra tekrar deneyin.');
        }
      }
    });
  };

  if (isLoading || loadingAccounts) {
    return (
      <div className="py-20 flex justify-center items-center">
        <Loader2 className="w-8 h-8 animate-spin text-erciyes-red" />
      </div>
    );
  }

  const myDisplayName = dbUser?.display_name ?? dbUser?.username ?? '';

  return (
    <div className="space-y-8">
      {/* Üst Header */}
      <div className="border-b border-border pb-5">
        <h1 className="text-3xl font-black tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
          Hesaplar Merkezi
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          ZirveKampüs hesaplarınızı yönetin, şifrenizi güncelleyin ve hesaplar arası geçiş yapın.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* SOL/ORTA KOLON: Çoklu Hesap Switcher ve Hesap Ekleme */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Aktif Hesap */}
          <div className="p-6 bg-card border border-border rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <ShieldCheck className="w-3 h-3" /> Aktif Hesap
              </span>
            </div>

            <h2 className="text-base font-bold mb-4 text-foreground uppercase tracking-wider">Mevcut Oturum</h2>
            
            <div className="flex items-center gap-4">
              {dbUser?.avatar_url ? (
                <div className="relative w-14 h-14 rounded-full overflow-hidden border border-border">
                  <Image src={dbUser.avatar_url} alt={myDisplayName || 'Profil Resmi'} fill className="object-cover" />
                </div>
              ) : (
                <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center text-lg font-bold text-muted-foreground border border-border">
                  {myDisplayName ? myDisplayName.slice(0, 2).toUpperCase() : 'U'}
                </div>
              )}
              <div>
                <p className="font-bold text-foreground">@{dbUser?.username}</p>
                <p className="text-sm text-muted-foreground">{myDisplayName}</p>
                <p className="text-xs text-muted-foreground/80 mt-1 flex items-center gap-1">
                  <Mail className="w-3 h-3" /> {firebaseUser?.email}
                </p>
              </div>
            </div>
          </div>

          {/* Bağlı Hesaplar & Hızlı Geçiş */}
          <div className="p-6 bg-card border border-border rounded-2xl">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-base font-bold text-foreground uppercase tracking-wider">Diğer Hesaplarınız</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Aynı e-postaya bağlı veya manuel eşleştirilmiş diğer profilleriniz. Şifresiz geçiş yapabilirsiniz.
                </p>
              </div>
              <button
                onClick={() => setShowLinkModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary hover:bg-secondary/80 text-xs font-semibold text-foreground border border-border transition-all"
              >
                <UserPlus className="w-3.5 h-3.5" /> Hesap Bağla
              </button>
            </div>

            {linkedAccounts.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-border rounded-xl">
                <p className="text-xs text-muted-foreground">Kayıtlı başka bir bağlı hesabınız bulunmuyor.</p>
                <Link
                  href="/giris-yap?redirect=/ayarlar/hesaplar"
                  className="inline-block mt-3 text-xs text-erciyes-red hover:underline font-bold"
                >
                  Aynı e-posta ile yeni bir hesap açın veya yeni hesap bağlayın.
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {linkedAccounts.map((acc) => {
                  const accDisplayName = acc.display_name ?? acc.username;
                  return (
                    <div key={acc.id} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        {acc.avatar_url ? (
                          <div className="relative w-10 h-10 rounded-full overflow-hidden border border-border">
                            <Image src={acc.avatar_url} alt={accDisplayName} fill className="object-cover" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground border border-border">
                            {accDisplayName.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-bold text-foreground">@{acc.username}</p>
                          <p className="text-xs text-muted-foreground">{accDisplayName}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSwitchAccount(acc.id)}
                          disabled={isPending}
                          className="px-3.5 py-1.5 rounded-lg bg-erciyes-red hover:bg-red-800 text-white text-xs font-semibold transition-colors shadow-sm disabled:opacity-50"
                        >
                          Geçiş Yap
                        </button>
                        <button
                          onClick={() => handleUnlinkAccount(acc.id)}
                          title="Bağlantıyı Kopar"
                          className="p-1.5 rounded-lg border border-border hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* SAĞ KOLON: Güvenlik Ayarları (Şifre & Hesap Silme) */}
        <div className="space-y-6">
          
          {/* Şifre Yönetimi */}
          <div className="p-6 bg-card border border-border rounded-2xl">
            <h2 className="text-base font-bold mb-4 text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-erciyes-red" /> Şifre Yönetimi
            </h2>

            {passwordStatus.success && (
              <div className="p-3 mb-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold">
                {passwordStatus.success}
              </div>
            )}
            {passwordStatus.error && (
              <div className="p-3 mb-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold">
                {passwordStatus.error}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Yeni Şifre</label>
                <input
                  type="password"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="min. 6 karakter"
                  required
                  className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-xs focus:outline-none focus:border-erciyes-red"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Yeni Şifre (Tekrar)</label>
                <input
                  type="password"
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  placeholder="şifrenizi doğrulayın"
                  required
                  className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-xs focus:outline-none focus:border-erciyes-red"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 py-2 rounded-lg bg-secondary hover:bg-border text-foreground border border-border text-xs font-bold transition-colors disabled:opacity-50"
                >
                  Şifreyi Güncelle
                </button>
                <button
                  type="button"
                  onClick={handleSendResetEmail}
                  className="px-3 py-2 rounded-lg border border-border hover:bg-secondary text-muted-foreground hover:text-foreground text-xs font-semibold transition-colors"
                  title="Sıfırlama e-postası yolla"
                >
                  Sıfırlama İste
                </button>
              </div>
            </form>
          </div>

          {/* Hesap Silme (Kritik Alan) */}
          <div className="p-6 bg-card border border-destructive/20 rounded-2xl bg-destructive/3">
            <h2 className="text-base font-bold mb-3 text-destructive uppercase tracking-wider flex items-center gap-1.5">
              <Trash2 className="w-4 h-4" /> Kritik İşlemler
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
              Hesabınızı kalıcı olarak silebilirsiniz. Tüm makaleleriniz, forum girdileriniz ve bağlantılarınız silinecektir. Bu işlem geri alınamaz.
            </p>

            {deleteError && (
              <div className="p-3 mb-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold">
                {deleteError}
              </div>
            )}

            {showDeleteConfirm ? (
              <div className="space-y-3 p-3.5 bg-destructive/5 border border-destructive/20 rounded-xl">
                <p className="text-xs text-destructive font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> EMİN MİSİNİZ?
                </p>
                <p className="text-[10px] text-muted-foreground leading-normal">
                  Hesabınızı ve bu hesaba bağlı tüm platform verilerini tamamen silmeyi onaylıyorsunuz.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={isPending}
                    className="flex-1 py-1.5 rounded-lg bg-destructive text-white text-xs font-bold hover:bg-red-800 transition-colors disabled:opacity-50"
                  >
                    {isPending ? 'Siliniyor...' : 'Evet, Kalıcı Olarak Sil'}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-3 py-1.5 rounded-lg border border-border hover:bg-secondary text-xs font-semibold transition-colors"
                  >
                    Vazgeç
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full py-2 rounded-lg border border-destructive/30 hover:border-destructive text-destructive hover:bg-destructive/10 text-xs font-bold transition-all"
              >
                HESABIMI SİL
              </button>
            )}
          </div>
        </div>

      </div>

      {/* ─── HESAP BAĞLAMA MODALI (Pop-up) ────────────────── */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowLinkModal(false)} />
          
          <div className="relative w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl p-6 z-10">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-lg text-foreground">Yeni Hesap Bağla</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Mevcut bir ZirveKampüs hesabınızın bilgilerini girerek bu hesaba bağlayın.
                </p>
              </div>
            </div>

            {linkStatus.error && (
              <div className="p-2.5 mb-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold">
                {linkStatus.error}
              </div>
            )}
            {linkStatus.success && (
              <div className="p-2.5 mb-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold">
                {linkStatus.success}
              </div>
            )}

            <form onSubmit={handleLinkAccount} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Bağlanacak Hesap Kullanıcı Adı
                </label>
                <input
                  type="text"
                  value={linkUsername}
                  onChange={(e) => setLinkUsername(e.target.value)}
                  placeholder="kullanıcı adı"
                  required
                  className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-xs focus:outline-none focus:border-erciyes-red"
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Bağlanacak Hesap Şifresi
                </label>
                <input
                  type="password"
                  value={linkPassword}
                  onChange={(e) => setLinkPassword(e.target.value)}
                  placeholder="şifreniz"
                  required
                  className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-xs focus:outline-none focus:border-erciyes-red"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 py-2.5 rounded-full bg-erciyes-red hover:bg-red-800 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Hesapları Eşleştir
                </button>
                <button
                  type="button"
                  onClick={() => setShowLinkModal(false)}
                  className="px-4 py-2.5 rounded-full border border-border hover:bg-secondary text-xs font-semibold transition-colors"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
