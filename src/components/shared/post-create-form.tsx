'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Image as ImageIcon,
  Smile,
  Hash,
  Users,
  X,
  Plus,
  Loader2,
  Share2,
  Globe,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  AtSign,
  ArrowLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/app/providers';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase/clientApp';
import MentionTextarea from './mention-textarea';
import Image from 'next/image';

interface PostCreateFormProps {
  onSuccess: (post: any) => void;
  onCancel?: () => void;
  placeholder?: string;
  inline?: boolean;
}

const POPULAR_EMOJIS = ['🎓', '📚', '🏫', '☕', '🔥', '💻', '🙌', '🎉', '📝', '🎯', '✨', '💬'];

export default function PostCreateForm({
  onSuccess,
  onCancel,
  placeholder = 'Kampüste neler oluyor? Açıklama ekle, #etiket yaz...',
  inline = false
}: PostCreateFormProps) {
  const { firebaseUser, dbUser } = useAuth();
  
  // Wizard Steps: 'select' | 'crop' | 'details'
  const [step, setStep] = useState<'select' | 'crop' | 'details'>('select');
  
  // State variables
  const [content, setContent] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '4:5' | '16:9' | 'original'>('1:1');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Crop floating menus
  const [showRatioMenu, setShowRatioMenu] = useState(false);
  const [showZoomSlider, setShowZoomSlider] = useState(false);
  
  // Zoom & Pan states
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });

  // Emoji & Advanced options toggles
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Contributors states
  const [contributorSearch, setContributorSearch] = useState('');
  const [contributorResults, setContributorResults] = useState<any[]>([]);
  const [selectedContributors, setSelectedContributors] = useState<any[]>([]);
  
  // Drag and drop ref
  const dragRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search contributors logic
  useEffect(() => {
    if (!contributorSearch.trim()) {
      setContributorResults([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/users?q=${encodeURIComponent(contributorSearch)}`);
        if (res.ok) {
          const data = await res.json();
          setContributorResults(data || []);
        }
      } catch (err) {
        console.error('Kullanıcı arama hatası:', err);
      }
    }, 200);

    return () => clearTimeout(delayDebounce);
  }, [contributorSearch]);

  // Handle drag pan events
  const handleImageMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    e.preventDefault();
    setIsPanning(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...pan };
  };

  const handleImageTouchStart = (e: React.TouchEvent) => {
    if (zoom <= 1 || e.touches.length !== 1) return;
    setIsPanning(true);
    dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    panStartRef.current = { ...pan };
  };

  useEffect(() => {
    if (!isPanning) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = (e.clientX - dragStartRef.current.x) / zoom;
      const dy = (e.clientY - dragStartRef.current.y) / zoom;
      setPan({
        x: panStartRef.current.x + dx,
        y: panStartRef.current.y + dy
      });
    };

    const handleMouseUp = () => {
      setIsPanning(false);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const dx = (e.touches[0].clientX - dragStartRef.current.x) / zoom;
      const dy = (e.touches[0].clientY - dragStartRef.current.y) / zoom;
      setPan({
        x: panStartRef.current.x + dx,
        y: panStartRef.current.y + dy
      });
    };

    const handleTouchEnd = () => {
      setIsPanning(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isPanning, zoom]);

  // Handle image select / drop and start background upload
  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0 || !firebaseUser) return;
    
    setError(null);
    const file = files[0];
    
    if (!file.type.startsWith('image/')) {
      setError('Lütfen geçerli bir görsel dosyası seçin.');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      setError('Görsel boyutu en fazla 5MB olabilir.');
      return;
    }

    // Set local preview URL for cropping immediately
    const localUrl = URL.createObjectURL(file);
    setImageUrls([localUrl]);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    
    if (!inline) {
      setStep('crop');
    }

    // Start background Firebase upload
    setIsUploading(true);
    setUploadProgress(0);

    const fileExtension = file.name.split('.').pop() || 'png';
    const filePath = `uploads/${firebaseUser.uid}/posts_${Date.now()}.${fileExtension}`;
    const storageRef = ref(storage, filePath);
    const metadata = { contentType: file.type };
    
    const uploadTask = uploadBytesResumable(storageRef, file, metadata);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (err) => {
        console.error('Firebase Storage upload error:', err);
        setError(`Görsel yüklenemedi: ${err.message}`);
        setIsUploading(false);
        setUploadProgress(null);
        // Fallback to select step if upload fails
        if (!inline) {
          setStep('select');
          setImageUrls([]);
        }
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          setImageUrls([downloadUrl]);
        } catch (err: any) {
          setError('Görsel bağlantı adresi alınamadı.');
        } finally {
          setIsUploading(false);
          setUploadProgress(null);
        }
      }
    );
  };

  // Drag over handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  // Emoji select
  const handleSelectEmoji = (emoji: string) => {
    setContent((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  // Tag helpers
  const handleInsertHash = () => {
    setContent((prev) => {
      if (prev.endsWith(' ') || prev === '') {
        return prev + '#';
      }
      return prev + ' #';
    });
  };

  const handleInsertMention = () => {
    setContent((prev) => {
      if (prev.endsWith(' ') || prev === '') {
        return prev + '@';
      }
      return prev + ' @';
    });
  };

  // Submit post submission
  const handleSubmit = async () => {
    const hasText = content.trim().length > 0;
    const hasImages = imageUrls.length > 0;

    if (!firebaseUser || (!hasText && !hasImages) || isUploading) return;

    setIsSubmitting(true);
    setError(null);

    // Extract mentions automatically from content (@username)
    const mentionRegex = /@([a-zA-Z0-9_.-]+)/g;
    const matches = Array.from(content.matchAll(mentionRegex));
    const extractedMentions = Array.from(new Set(matches.map(m => m[1])));

    try {
      const res = await fetch('/api/user/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${firebaseUser.idToken}`
        },
        body: JSON.stringify({
          content,
          imageUrls,
          mentions: extractedMentions,
          contributors: selectedContributors.map((c) => c.id),
          aspectRatio
        })
      });

      if (res.ok) {
        const json = await res.json();
        
        onSuccess({
          ...json.post,
          author: {
            id: dbUser?.id,
            username: dbUser?.username,
            display_name: dbUser?.display_name,
            avatar_url: dbUser?.avatar_url,
            role: dbUser?.role
          }
        });

        // Reset state
        setContent('');
        setImageUrls([]);
        setSelectedContributors([]);
        setContributorSearch('');
        setAspectRatio('1:1');
        setZoom(1);
        setPan({ x: 0, y: 0 });
        setShowAdvanced(false);
        setStep('select');
      } else {
        const json = await res.json();
        setError(json.error || 'Gönderi paylaşılamadı.');
      }
    } catch (err) {
      setError('Sunucu bağlantı hatası oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasContent = content.trim().length > 0 || imageUrls.length > 0;

  // ────────────────────────────────────────────────────────────────────────────
  // INLINE MODE RENDERING (e.g. for Profile Feed Box)
  // ────────────────────────────────────────────────────────────────────────────
  if (inline) {
    return (
      <div
        ref={dragRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="relative flex flex-col bg-card/65 backdrop-blur-md transition-all duration-300 rounded-2xl border border-border p-5 shadow-sm"
      >
        <AnimatePresence>
          {isDragging && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-secondary/80 backdrop-blur-md z-[100] rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-erciyes-red/60 m-1 pointer-events-none"
            >
              <ImageIcon className="w-12 h-12 text-erciyes-red animate-bounce mb-3" />
              <p className="text-sm font-bold text-foreground">Görselleri Buraya Bırakın</p>
              <p className="text-xs text-muted-foreground mt-1">Sadece resim dosyaları (Maks 5MB)</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <div className="flex-1">{error}</div>
              <button onClick={() => setError(null)} className="hover:opacity-85">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Growing Textarea */}
          <div className="relative rounded-2xl bg-secondary/15 border border-border/40 hover:border-border/80 focus-within:border-erciyes-red/60 focus-within:ring-1 focus-within:ring-erciyes-red/20 transition-all p-1">
            <MentionTextarea
              value={content}
              onChange={(e: any) => setContent(e.target.value)}
              placeholder={placeholder}
              className="w-full min-h-[110px] p-3 bg-transparent text-foreground placeholder:text-muted-foreground/60 focus:outline-none transition-all resize-none text-xs leading-relaxed border-0 focus:ring-0"
              rows={4}
            />

            <div className="flex items-center justify-between px-3 py-2 border-t border-border/20 bg-secondary/5 rounded-b-xl">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-lg hover:bg-secondary text-emerald-500 transition-all active:scale-95"
                  title="Görsel Ekle"
                >
                  <ImageIcon className="w-4 h-4" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileSelect(e.target.files)}
                  className="hidden"
                  disabled={isUploading}
                />

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-2 rounded-lg hover:bg-secondary text-amber-500 transition-all active:scale-95"
                    title="Emoji Ekle"
                  >
                    <Smile className="w-4 h-4" />
                  </button>
                  {showEmojiPicker && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowEmojiPicker(false)} />
                      <div className="absolute left-0 bottom-full mb-2 bg-card border border-border rounded-xl shadow-2xl p-2 z-50 flex gap-1.5 flex-wrap w-44">
                        {POPULAR_EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => handleSelectEmoji(emoji)}
                            className="hover:bg-secondary p-1 rounded-md text-sm transition-transform hover:scale-110"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleInsertMention}
                  className="p-2 rounded-lg hover:bg-secondary text-blue-500 transition-all active:scale-95"
                  title="Kullanıcı Bahset (@)"
                >
                  <AtSign className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleInsertHash}
                  className="p-2 rounded-lg hover:bg-secondary text-purple-500 transition-all active:scale-95"
                  title="Etiket Ekle (#)"
                >
                  <Hash className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className={cn(
                    "p-2 rounded-lg transition-all active:scale-95 flex items-center gap-1 text-[10px] font-bold px-2.5",
                    showAdvanced || selectedContributors.length > 0 ? "bg-erciyes-red/10 text-erciyes-red" : "hover:bg-secondary text-muted-foreground"
                  )}
                  title="Ortak Yazar Ekle"
                >
                  <Users className="w-4 h-4" />
                  {selectedContributors.length > 0 && <span>{selectedContributors.length}</span>}
                </button>
              </div>
              <div className="text-[9px] font-extrabold text-muted-foreground/60 tracking-wider">
                {content.length} karakter
              </div>
            </div>
          </div>

          {/* Previews */}
          {imageUrls.length > 0 || isUploading ? (
            <div className="relative rounded-2xl overflow-hidden border border-border/40 bg-secondary/5 p-2">
              <div className="relative mx-auto flex items-center justify-center aspect-square h-[200px] w-[200px] rounded-xl overflow-hidden">
                <img
                  src={imageUrls[0]}
                  alt="Önizleme"
                  className="w-full h-full object-cover select-none"
                  style={{
                    transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
                    transformOrigin: 'center center'
                  }}
                  onMouseDown={handleImageMouseDown}
                  onTouchStart={handleImageTouchStart}
                />
                <button
                  type="button"
                  onClick={() => {
                    setImageUrls([]);
                    setZoom(1);
                    setPan({ x: 0, y: 0 });
                  }}
                  className="absolute top-2 right-2 p-1 rounded-full bg-black/70 text-white shadow-md z-10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              {isUploading && (
                <div className="mt-2 space-y-1 bg-secondary/15 p-2 rounded-xl border border-border/30 text-[10px] font-bold text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Görsel yükleniyor...</span>
                    <span>{Math.round(uploadProgress ?? 0)}%</span>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* Advanced co-authors */}
          {showAdvanced && (
            <div className="border border-border/40 rounded-2xl p-4 bg-secondary/5 space-y-3 relative text-left">
              <label className="block text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/80">Ortak Yazarlar</label>
              <input
                type="text"
                value={contributorSearch}
                onChange={(e) => setContributorSearch(e.target.value)}
                placeholder="Kullanıcı ara..."
                className="w-full px-3 py-2 rounded-xl border border-border bg-card text-xs focus:outline-none focus:border-erciyes-red/60"
              />
              {contributorResults.length > 0 && (
                <div className="absolute left-4 right-4 bg-card border border-border rounded-xl shadow-2xl z-45 p-1 max-h-40 overflow-y-auto">
                  {contributorResults.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => {
                        if (!selectedContributors.some(c => c.id === user.id)) {
                          setSelectedContributors(prev => [...prev, user]);
                        }
                        setContributorSearch('');
                        setContributorResults([]);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-secondary rounded-lg"
                    >
                      <span className="text-xs font-bold">@{user.username}</span>
                    </button>
                  ))}
                </div>
              )}
              {selectedContributors.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedContributors.map((user) => (
                    <span key={user.id} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-bold border border-emerald-500/20">
                      {user.display_name ?? user.username}
                      <button type="button" onClick={() => setSelectedContributors(prev => prev.filter(c => c.id !== user.id))}>
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || isUploading || !hasContent}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-gradient-to-r from-erciyes-red to-red-700 text-white text-xs font-extrabold disabled:opacity-40"
            >
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>Paylaş</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // WIZARD STEP RENDERING (Modal style for homepage)
  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div
      ref={dragRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative flex flex-col bg-card/65 backdrop-blur-md transition-all duration-300 w-full max-h-[85vh] sm:max-h-[90vh]"
    >
      {/* Full-screen drag drop zone overlay */}
      <AnimatePresence>
        {isDragging && step === 'select' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-secondary/80 backdrop-blur-md z-[100] rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-erciyes-red/60 m-1 pointer-events-none"
          >
            <ImageIcon className="w-12 h-12 text-erciyes-red animate-bounce mb-3" />
            <p className="text-sm font-bold text-foreground">Görselleri Buraya Bırakın</p>
            <p className="text-xs text-muted-foreground mt-1">Sadece resim dosyaları desteklenir (Maks 5MB)</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ────────────────────────────────────────────────────────────────────────
          STEP 1: SELECT
          ──────────────────────────────────────────────────────────────────────── */}
      {step === 'select' && (
        <div className="flex flex-col h-[400px]">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
            <span className="text-sm font-extrabold text-foreground">Yeni gönderi oluştur</span>
            {onCancel && (
              <button onClick={onCancel} className="p-2 rounded-xl hover:bg-secondary/80 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-secondary/40 flex items-center justify-center border border-border/20 text-muted-foreground/60">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Fotoğrafları buraya sürükleyin</p>
              <p className="text-xs text-muted-foreground mt-1">Sürükle-bırak veya bilgisayardan seç</p>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
            >
              Bilgisayardan seç
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
            />
            {error && (
              <p className="text-xs font-bold text-destructive flex items-center gap-1 justify-center bg-destructive/10 px-3 py-1.5 rounded-xl border border-destructive/20 mt-2">
                <AlertCircle className="w-3.5 h-3.5" />
                {error}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          STEP 2: CROP
          ──────────────────────────────────────────────────────────────────────── */}
      {step === 'crop' && (
        <div className="flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
            <button
              onClick={() => {
                setStep('select');
                setImageUrls([]);
              }}
              className="p-2 rounded-xl hover:bg-secondary/80 text-muted-foreground hover:text-foreground active:scale-95"
              title="Geri Git"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-extrabold text-foreground">Kırp</span>
            <button
              onClick={() => setStep('details')}
              className="px-3.5 py-1.5 text-xs font-extrabold text-blue-500 hover:text-blue-600 active:scale-95"
            >
              İleri
            </button>
          </div>

          {/* Body */}
          <div className="p-5 flex flex-col items-center justify-center bg-secondary/5 min-h-[350px]">
            {error && (
              <div className="w-full mb-3 flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            <div className="relative rounded-2xl overflow-hidden border border-border/40 bg-black/40 p-2 w-full flex items-center justify-center">
              <div
                className={cn(
                  "relative bg-secondary/10 group/img rounded-xl overflow-hidden border border-border/20 shadow-inner mx-auto flex items-center justify-center",
                  aspectRatio === '1:1' ? "aspect-square h-[300px] w-[300px]" :
                  aspectRatio === '4:5' ? "aspect-[4/5] h-[300px] w-[240px]" :
                  aspectRatio === '16:9' ? "aspect-[16/9] w-full max-w-[450px] h-[253px]" :
                  "aspect-[4/3] h-[300px] w-[400px]"
                )}
              >
                <img
                  src={imageUrls[0]}
                  alt="Önizleme"
                  draggable={false}
                  className={cn(
                    "w-full h-full object-cover select-none",
                    zoom > 1 ? "cursor-move" : "cursor-default"
                  )}
                  style={{
                    transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
                    transformOrigin: 'center center',
                    transition: isPanning ? 'none' : 'transform 0.15s ease-out'
                  }}
                  onMouseDown={handleImageMouseDown}
                  onTouchStart={handleImageTouchStart}
                />

                {/* Floating Aspect Ratio Selector */}
                <div className="absolute bottom-4 left-4 z-20">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRatioMenu(!showRatioMenu);
                      setShowZoomSlider(false);
                    }}
                    className="p-2 rounded-full bg-black/70 hover:bg-black/90 text-white transition-all shadow-md flex items-center justify-center active:scale-95"
                    title="Oran Değiştir"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  </button>

                  {showRatioMenu && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setShowRatioMenu(false)} />
                      <div className="absolute bottom-full left-0 mb-2 bg-black/90 border border-white/10 rounded-xl shadow-2xl p-1 z-40 flex flex-col min-w-[120px] text-white">
                        {[
                          { label: 'Orijinal (4:3)', value: 'original' },
                          { label: '1:1', value: '1:1' },
                          { label: '4:5', value: '4:5' },
                          { label: '16:9', value: '16:9' }
                        ].map((r) => (
                          <button
                            key={r.value}
                            type="button"
                            onClick={() => {
                              setAspectRatio(r.value as any);
                              setShowRatioMenu(false);
                              setZoom(1);
                              setPan({ x: 0, y: 0 });
                            }}
                            className={cn(
                              "px-3 py-2 text-left text-xs font-extrabold rounded-lg hover:bg-white/10 transition-colors",
                              aspectRatio === r.value ? "text-erciyes-red" : "text-white"
                            )}
                          >
                            {r.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Floating Zoom Control */}
                <div className="absolute bottom-4 left-14 z-20">
                  <button
                    type="button"
                    onClick={() => {
                      setShowZoomSlider(!showZoomSlider);
                      setShowRatioMenu(false);
                    }}
                    className="p-2 rounded-full bg-black/70 hover:bg-black/90 text-white transition-all shadow-md flex items-center justify-center active:scale-95"
                    title="Yakınlaştır"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                    </svg>
                  </button>

                  {showZoomSlider && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setShowZoomSlider(false)} />
                      <div className="absolute bottom-full left-0 mb-2 bg-black/90 border border-white/10 rounded-xl shadow-2xl p-3 z-40 flex items-center gap-2 w-48 text-white">
                        <input
                          type="range"
                          min="1"
                          max="3"
                          step="0.05"
                          value={zoom}
                          onChange={(e) => {
                            const newZoom = parseFloat(e.target.value);
                            setZoom(newZoom);
                            if (newZoom === 1) {
                              setPan({ x: 0, y: 0 });
                            }
                          }}
                          className="flex-1 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-erciyes-red"
                        />
                        <span className="text-[10px] font-bold min-w-[30px] text-right">{Math.round(zoom * 100)}%</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {isUploading && (
              <div className="w-full mt-3 space-y-1 bg-secondary/10 p-3 rounded-xl border border-border/30 animate-pulse">
                <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin text-erciyes-red" />
                    Görsel yükleniyor...
                  </span>
                  <span>{Math.round(uploadProgress ?? 0)}%</span>
                </div>
                <div className="w-full h-1 bg-secondary/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-erciyes-red to-red-500 rounded-full transition-all duration-150"
                    style={{ width: `${uploadProgress ?? 0}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          STEP 3: DETAILS (Split columns and footer submit)
          ──────────────────────────────────────────────────────────────────────── */}
      {step === 'details' && (
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
            <button
              onClick={() => setStep('crop')}
              className="p-2 rounded-xl hover:bg-secondary/80 text-muted-foreground hover:text-foreground active:scale-95"
              title="Geri Git"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-extrabold text-foreground">Yeni gönderi oluştur</span>
            <div className="w-8 h-8" /> {/* Spacer to center the header title */}
          </div>

          {/* Split Body */}
          <div className="p-5 flex-1 overflow-y-auto">
            {error && (
              <div className="mb-4 flex items-center gap-2 p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <div className="flex-1 leading-normal">{error}</div>
                <button onClick={() => setError(null)} className="hover:opacity-80">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Left Column: Image Preview */}
              <div className="flex items-center justify-center bg-secondary/5 rounded-2xl border border-border/40 p-2 overflow-hidden max-h-[350px]">
                <div
                  className={cn(
                    "relative overflow-hidden rounded-xl border border-border/20 shadow-inner flex items-center justify-center",
                    aspectRatio === '1:1' ? "aspect-square h-[280px] w-[280px]" :
                    aspectRatio === '4:5' ? "aspect-[4/5] h-[280px] w-[224px]" :
                    aspectRatio === '16:9' ? "aspect-[16/9] w-full max-h-[280px] h-[157px]" :
                    "aspect-[4/3] h-[280px] w-[373px]"
                  )}
                >
                  <img
                    src={imageUrls[0]}
                    alt="Önizleme"
                    className="w-full h-full object-cover select-none pointer-events-none"
                    style={{
                      transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
                      transformOrigin: 'center center'
                    }}
                  />
                </div>
              </div>

              {/* Right Column: Write caption & mentions */}
              <div className="flex flex-col space-y-4">
                {/* Author Info */}
                <div className="flex items-center gap-2.5">
                  <div className="relative w-8 h-8 rounded-full overflow-hidden border border-border flex-shrink-0">
                    {dbUser?.avatar_url ? (
                      <Image src={dbUser.avatar_url} alt={dbUser.username} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full bg-secondary flex items-center justify-center font-bold text-[10px] uppercase">
                        {dbUser?.username?.slice(0, 2) ?? 'U'}
                      </div>
                    )}
                  </div>
                  <span className="font-extrabold text-xs text-foreground">
                    {dbUser?.display_name ?? dbUser?.username}
                  </span>
                </div>

                {/* Textarea */}
                <div className="relative rounded-xl bg-secondary/15 border border-border/40 hover:border-border/80 focus-within:border-erciyes-red/60 transition-all p-1">
                  <MentionTextarea
                    value={content}
                    onChange={(e: any) => setContent(e.target.value)}
                    placeholder={placeholder}
                    className="w-full min-h-[100px] p-3 bg-transparent text-foreground placeholder:text-muted-foreground/60 focus:outline-none transition-all resize-none text-xs leading-relaxed border-0 focus:ring-0"
                    rows={4}
                  />

                  {/* Toolbar */}
                  <div className="flex items-center justify-between px-3 py-2 border-t border-border/20 bg-secondary/5 rounded-b-xl">
                    <div className="flex items-center gap-1">
                      {/* Emoji Selector */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          className="p-1.5 rounded-lg hover:bg-secondary text-amber-500 transition-all active:scale-95"
                          title="Emoji Ekle"
                        >
                          <Smile className="w-4 h-4" />
                        </button>
                        
                        {showEmojiPicker && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowEmojiPicker(false)} />
                            <div className="absolute left-0 bottom-full mb-2 bg-card border border-border rounded-xl shadow-2xl p-2 z-50 flex gap-1.5 flex-wrap w-44">
                              {POPULAR_EMOJIS.map((emoji) => (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => handleSelectEmoji(emoji)}
                                  className="hover:bg-secondary p-1 rounded-md text-sm transition-transform hover:scale-110"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Mention Icon */}
                      <button
                        type="button"
                        onClick={handleInsertMention}
                        className="p-1.5 rounded-lg hover:bg-secondary text-blue-500 transition-all active:scale-95"
                        title="Kullanıcı Bahset (@)"
                      >
                        <AtSign className="w-4 h-4" />
                      </button>

                      {/* Hashtag Icon */}
                      <button
                        type="button"
                        onClick={handleInsertHash}
                        className="p-1.5 rounded-lg hover:bg-secondary text-purple-500 transition-all active:scale-95"
                        title="Etiket Ekle (#)"
                      >
                        <Hash className="w-4 h-4" />
                      </button>

                      {/* Advanced co-authors toggle */}
                      <button
                        type="button"
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className={cn(
                          "p-1.5 rounded-lg transition-all active:scale-95 flex items-center gap-1 text-[9px] font-bold px-2",
                          showAdvanced || selectedContributors.length > 0
                            ? "bg-erciyes-red/10 text-erciyes-red"
                            : "hover:bg-secondary text-muted-foreground"
                        )}
                        title="Katkıda Bulunan / Ortak Yazar Ekle"
                      >
                        <Users className="w-3.5 h-3.5" />
                        {selectedContributors.length > 0 && <span>{selectedContributors.length}</span>}
                      </button>
                    </div>

                    <div className="text-[9px] font-bold text-muted-foreground/60">
                      {content.length} karakter
                    </div>
                  </div>
                </div>

                {/* Collapsible Co-authors Search */}
                {showAdvanced && (
                  <div className="border border-border/40 rounded-xl p-3 bg-secondary/5 space-y-2 relative text-left">
                    <label className="block text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground/80">Ortak Yazarlar / Katkıda Bulunanlar</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={contributorSearch}
                        onChange={(e) => setContributorSearch(e.target.value)}
                        placeholder="Kullanıcı ara..."
                        className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-card text-xs focus:outline-none focus:border-erciyes-red/60"
                      />
                      
                      {contributorResults.length > 0 && (
                        <>
                          <div className="fixed inset-0 z-35" onClick={() => setContributorResults([])} />
                          <div className="absolute left-0 right-0 mt-1 max-h-32 overflow-y-auto bg-card border border-border rounded-xl shadow-2xl z-45 p-1">
                            {contributorResults.map((user) => (
                              <button
                                key={user.id}
                                type="button"
                                onClick={() => {
                                  if (!selectedContributors.some(c => c.id === user.id)) {
                                    setSelectedContributors(prev => [...prev, user]);
                                  }
                                  setContributorSearch('');
                                  setContributorResults([]);
                                }}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-secondary rounded-lg text-xs text-left"
                              >
                                <span>{user.display_name ?? user.username}</span>
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    {selectedContributors.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {selectedContributors.map((user) => (
                          <span
                            key={user.id}
                            className="inline-flex items-center gap-1 pl-1.5 pr-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[9px] font-bold border border-emerald-500/20"
                          >
                            {user.display_name ?? user.username}
                            <button
                              type="button"
                              onClick={() => setSelectedContributors(prev => prev.filter(c => c.id !== user.id))}
                            >
                              <X className="w-2 h-2" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer controls for details step */}
          <div className="flex items-center justify-between px-5 py-4 border-t border-border/40 bg-secondary/5 rounded-b-2xl">
            <div className="text-[10px] font-bold text-muted-foreground flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-border/20 bg-background/30 shadow-inner">
              <Globe className="w-3.5 h-3.5" />
              <span>Herkese Açık</span>
            </div>

            <div className="flex items-center gap-2">
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2.5 rounded-xl border border-border bg-card text-foreground text-xs font-bold hover:bg-secondary transition-all active:scale-95"
                >
                  Vazgeç
                </button>
              )}
              
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || isUploading || !hasContent}
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-gradient-to-r from-erciyes-red via-red-600 to-red-700 hover:from-red-600 hover:to-red-800 text-white text-xs font-extrabold transition-all shadow-md disabled:opacity-40 disabled:shadow-none active:scale-[0.98] select-none cursor-pointer"
              >
                {isSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Share2 className="w-3.5 h-3.5" />
                )}
                <span>Paylaş</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
