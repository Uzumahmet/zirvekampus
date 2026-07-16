'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/app/providers';
import { useRouter } from 'next/navigation';
import { Bell, Heart, UserPlus, MessageSquare, Bookmark, Share2, Loader2, ArrowRight } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import Image from 'next/image';
import Link from 'next/link';

export default function NotificationsPage() {
  const { firebaseUser, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/giris-yap');
      return;
    }

    if (firebaseUser) {
      const fetchNotifications = async () => {
        try {
          const res = await fetch('/api/user/notifications', {
            headers: { Authorization: `Bearer ${firebaseUser.idToken}` }
          });
          if (res.ok) {
            const data = await res.json();
            setNotifications(data.notifications || []);
          }
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      };

      fetchNotifications();
    }
  }, [firebaseUser, isAuthenticated, isLoading, router]);

  if (isLoading || loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-erciyes-red" />
        <p className="text-xs text-muted-foreground font-semibold">Bildirimler yükleniyor...</p>
      </div>
    );
  }

  // Bildirim Tipine Göre İkon ve Renk Seç
  const getNotificationConfig = (type: string) => {
    switch (type) {
      case 'like':
      case 'project_like':
        return {
          icon: <Heart className="w-2.5 h-2.5 fill-current" />,
          colorClass: 'bg-red-500',
          textColor: 'text-red-500'
        };
      case 'follow':
        return {
          icon: <UserPlus className="w-2.5 h-2.5" />,
          colorClass: 'bg-blue-500',
          textColor: 'text-blue-500'
        };
      case 'project_comment':
        return {
          icon: <MessageSquare className="w-2.5 h-2.5" />,
          colorClass: 'bg-cyan-500',
          textColor: 'text-cyan-400'
        };
      case 'article_save':
        return {
          icon: <Bookmark className="w-2.5 h-2.5 fill-current" />,
          colorClass: 'bg-amber-500',
          textColor: 'text-amber-500'
        };
      case 'mention':
        return {
          icon: <Share2 className="w-2.5 h-2.5" />,
          colorClass: 'bg-purple-500',
          textColor: 'text-purple-400'
        };
      case 'new_post':
        return {
          icon: <Bell className="w-2.5 h-2.5" />,
          colorClass: 'bg-emerald-500',
          textColor: 'text-emerald-450'
        };
      default:
        return {
          icon: <Bell className="w-2.5 h-2.5" />,
          colorClass: 'bg-secondary',
          textColor: 'text-muted-foreground'
        };
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <div className="p-2 bg-erciyes-red/10 border border-erciyes-red/20 rounded-xl">
          <Bell className="w-5 h-5 text-erciyes-red" />
        </div>
        <div>
          <h1 className="text-xl font-black text-foreground">Bildirimler</h1>
          <p className="text-[10px] text-muted-foreground mt-0.5">Etkileşimlerinizi ve takip hareketlerini takip edin</p>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border rounded-2xl space-y-3">
          <Bell className="w-10 h-10 mx-auto opacity-25 text-muted-foreground" />
          <p className="font-semibold text-sm text-muted-foreground">Henüz yeni bir bildirim bulunmuyor.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => {
            const shownName = notification.user?.display_name ?? notification.user?.username ?? 'Bir öğrenci';
            const avatarUrl = notification.user?.avatar_url;
            const config = getNotificationConfig(notification.type);

            return (
              <div
                key={notification.id}
                className="flex items-center justify-between gap-3 p-4 bg-card border border-border rounded-2xl hover:border-border/80 hover:shadow-sm transition-all duration-300"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Sol İkon / Avatar */}
                  <div className="relative flex-shrink-0">
                    <Link href={`/${notification.user?.username}`}>
                      {avatarUrl ? (
                        <Image
                          src={avatarUrl}
                          alt={shownName}
                          width={38}
                          height={38}
                          className="rounded-full border border-border object-cover"
                        />
                      ) : (
                        <div className="w-9.5 h-9.5 rounded-full bg-secondary flex items-center justify-center font-bold text-muted-foreground text-xs uppercase border border-border">
                          {shownName.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </Link>

                    {/* Küçük Durum İkonu */}
                    <div className={`absolute -bottom-1 -right-1 p-1 rounded-full text-white border border-card flex items-center justify-center ${config.colorClass}`}>
                      {config.icon}
                    </div>
                  </div>

                  {/* Bildirim İçeriği */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground leading-normal">
                      <Link href={`/${notification.user?.username}`} className="font-bold hover:text-erciyes-red transition-colors mr-1">
                        @{notification.user?.username}
                      </Link>
                      <span className="text-muted-foreground">{notification.message}</span>
                    </p>
                    <span className="text-[9px] text-muted-foreground/60 mt-1 block">
                      {formatRelativeTime(notification.created_at)}
                    </span>
                  </div>
                </div>

                {/* Eğer tıklanabilir bir hedef adresi varsa detay butonu */}
                {notification.link && (
                  <Link
                    href={notification.link}
                    className="p-2 rounded-xl border border-border/80 bg-secondary/30 hover:bg-secondary hover:text-erciyes-red text-muted-foreground transition-all flex-shrink-0"
                    title="İçeriğe Git"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
