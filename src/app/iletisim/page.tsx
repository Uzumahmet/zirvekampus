'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, MessageSquare, Send, CheckCircle2, AlertCircle, Compass, ShieldAlert } from 'lucide-react';

export default function IletisimPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      setError('Lütfen tüm alanları doldurun.');
      return;
    }

    if (message.length < 15) {
      setError('Mesajınız en az 15 karakter olmalıdır.');
      return;
    }

    setIsLoading(true);
    setError('');

    // Simulate API request delay
    setTimeout(() => {
      setIsLoading(false);
      setSuccess(true);
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    }, 1500);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring', stiffness: 100, damping: 15 },
    },
  };

  return (
    <div className="min-h-screen py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-12"
      >
        {/* ─── HERO BAŞLIK ────────────────────────────────────── */}
        <motion.section variants={itemVariants} className="text-center space-y-4">
          <div className="inline-flex items-center gap-3 px-3 py-1 rounded-full bg-secondary text-xs font-semibold tracking-wider text-erciyes-red">
            <Mail className="w-4 h-4 text-erciyes-red" />
            İLETİŞİME GEÇİN
          </div>
          <h1 className="hero-heading text-4xl sm:text-5xl md:text-6xl text-foreground">
            Bize Ulaşın
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Geri bildirimleriniz, soru ve önerileriniz ya da teknik destek talepleriniz için aşağıdaki formu doldurabilir veya doğrudan mail adreslerimizden bize ulaşabilirsiniz.
          </p>
        </motion.section>

        {/* ─── KART DÜZENİ (İLETİŞİM BİLGİLERİ + FORM) ───────────── */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* İletişim Bilgileri (5 Sütun) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 rounded-2xl border border-border bg-card/40 space-y-6">
              <h2 className="font-bold text-xl text-foreground pb-4 border-b border-border">
                İletişim Noktalarımız
              </h2>

              <div className="space-y-4">
                {/* Genel Destek */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5 text-erciyes-red" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-foreground">Genel Destek</h4>
                    <p className="text-xs text-muted-foreground mb-1">Görüş, öneri ve topluluk soruları için</p>
                    <a href="mailto:destek@zirvekampus.com" className="text-sm font-medium text-erciyes-red hover:underline">
                      destek@zirvekampus.com
                    </a>
                  </div>
                </div>

                {/* Geliştirici Ekip */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                    <Compass className="w-5 h-5 text-yellow-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-foreground">Geliştirici Ekip</h4>
                    <p className="text-xs text-muted-foreground mb-1">Hata bildirimleri ve teknik konular için</p>
                    <a href="mailto:yazilim@zirvekampus.com" className="text-sm font-medium text-yellow-500 hover:underline">
                      yazilim@zirvekampus.com
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Bağımsızlık Bilgilendirme */}
            <div className="p-6 rounded-2xl border border-border bg-secondary/30 space-y-3">
              <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-erciyes-red" />
                Önemli Not
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                ZirveKampüs bağımsız bir oluşumdur. Ders notları, sınav sistemleri (OBİSİS, ERUDEM) veya resmi okul işleriyle ilgili sorunlarınız için lütfen resmi üniversite kanallarıyla iletişime geçin.
              </p>
            </div>
          </div>

          {/* İletişim Formu (7 Sütun) */}
          <div className="lg:col-span-7">
            <div className="p-8 rounded-2xl border border-border bg-card/60 shadow-lg shadow-black/5 relative overflow-hidden">
              <AnimatePresence mode="wait">
                {!success ? (
                  <motion.form
                    key="contact-form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onSubmit={handleSubmit}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Ad Soyad */}
                      <div className="space-y-2">
                        <label htmlFor="name" className="text-xs font-semibold text-muted-foreground">
                          Ad Soyad
                        </label>
                        <input
                          id="name"
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Ahmet Yılmaz"
                          className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                          required
                        />
                      </div>

                      {/* E-posta */}
                      <div className="space-y-2">
                        <label htmlFor="email" className="text-xs font-semibold text-muted-foreground">
                          E-posta Adresi
                        </label>
                        <input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="ahmet@example.com"
                          className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                          required
                        />
                      </div>
                    </div>

                    {/* Konu */}
                    <div className="space-y-2">
                      <label htmlFor="subject" className="text-xs font-semibold text-muted-foreground">
                        Konu
                      </label>
                      <input
                        id="subject"
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Öneri, Şikayet, Sponsorluk vb."
                        className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        required
                      />
                    </div>

                    {/* Mesaj */}
                    <div className="space-y-2">
                      <label htmlFor="message" className="text-xs font-semibold text-muted-foreground">
                        Mesajınız
                      </label>
                      <textarea
                        id="message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Mesajınızı buraya yazın..."
                        rows={5}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                        required
                      />
                    </div>

                    {/* Hata Mesajı */}
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 rounded-xl border border-destructive/20 bg-destructive/5 text-destructive text-xs flex items-center gap-2"
                      >
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{error}</span>
                      </motion.div>
                    )}

                    {/* Gönder Butonu */}
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/95 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/10 text-sm"
                    >
                      {isLoading ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                            className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full"
                          />
                          Gönderiliyor...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Mesajı Gönder
                        </>
                      )}
                    </button>
                  </motion.form>
                ) : (
                  <motion.div
                    key="success-message"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="py-12 flex flex-col items-center text-center space-y-4"
                  >
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-bold text-xl text-foreground">Mesajınız Alındı!</h3>
                      <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
                        Bizimle iletişime geçtiğiniz için teşekkürler. İlgili ekibimiz en kısa sürede size geri dönüş yapacaktır.
                      </p>
                    </div>
                    <button
                      onClick={() => setSuccess(false)}
                      className="px-5 py-2 rounded-xl bg-secondary text-secondary-foreground font-semibold hover:bg-secondary/80 border border-border transition-colors text-xs"
                    >
                      Yeni Bir Mesaj Gönder
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
