'use client';

import { motion } from 'framer-motion';
import { BookOpen, Users, ShieldAlert, Award, MessageSquare, Heart } from 'lucide-react';
import Link from 'next/link';

export default function HakkimizdaPage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring', stiffness: 80, damping: 15 },
    },
  };

  return (
    <div className="min-h-screen py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-16"
      >
        {/* ─── HERO BÖLÜMÜ ────────────────────────────────────── */}
        <motion.section variants={itemVariants} className="text-center space-y-6">
          <div className="inline-flex items-center gap-3 px-3 py-1 rounded-full bg-secondary text-xs font-semibold tracking-wider text-erciyes-red">
            <Award className="w-4 h-4 text-erciyes-red" />
            BİZ KİMİZ?
          </div>
          <h1 className="hero-heading text-4xl sm:text-5xl md:text-6xl text-foreground">
            Fikirlerin Özgürce{' '}
            <em className="display-italic-red not-italic" style={{ fontStyle: 'italic' }}>
              Buluştuğu
            </em>
            <br />
            Bağımsız Kampüs Platformu
          </h1>
          <p className="text-muted-foreground text-lg sm:text-xl max-w-3xl mx-auto leading-relaxed">
            ZirveKampüs, Erciyes Üniversitesi öğrencilerinin fikirlerini özgürce paylaşabilmesi, 
            profesyonel yazılar kaleme alabilmesi ve kampüs gündemini belirleyebilmesi için tasarlanmış bağımsız bir dijital platformdur.
          </p>
        </motion.section>

        {/* ─── DEĞERLERİMİZ / ÖZELLİKLER ───────────────────────── */}
        <motion.section variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl border border-border bg-card/40 hover:bg-card/70 transition-all duration-300 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-erciyes-red/20 to-red-600/5 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-erciyes-red" />
            </div>
            <h3 className="font-bold text-lg text-foreground">Derinlikli Makaleler</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Öğrencilerin ve akademisyenlerin ilgi duydukları alanlarda yazdıkları makalelerle bilgi birikimini artırıyor, Medium tarzı bir okuma deneyimi sunuyoruz.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-border bg-card/40 hover:bg-card/70 transition-all duration-300 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500/20 to-yellow-600/5 flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-yellow-500" />
            </div>
            <h3 className="font-bold text-lg text-foreground">Kampüs Sözlüğü</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Ekşi Sözlük tarzı anonim veya profilli entry sistemiyle öğrencilerin kampüs hayatı, dersler ve hocalar hakkında dürüst yorumlar paylaşmasını sağlıyoruz.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-border bg-card/40 hover:bg-card/70 transition-all duration-300 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/5 flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-500" />
            </div>
            <h3 className="font-bold text-lg text-foreground">Güçlü Topluluk</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Kampüs içindeki kulüplerin, etkinliklerin ve gelişmelerin sesi oluyor; öğrencilerin birbirleriyle sağlıklı bağlar kurmasına zemin hazırlıyoruz.
            </p>
          </div>
        </motion.section>

        {/* ─── HİKAYEMİZ ──────────────────────────────────────── */}
        <motion.section variants={itemVariants} className="border-t border-border pt-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="space-y-6">
              <h2 className="section-heading text-3xl text-foreground">
                Hikayemiz <span className="text-erciyes-red">Nasıl Başladı?</span>
              </h2>
              <div className="space-y-4 text-muted-foreground text-sm leading-relaxed">
                <p>
                  Kampüsteki en büyük eksikliğin, öğrencilerin seslerini geniş kitlelere duyurabileceği ve bilgi birikimlerini 
                  kalıcı kılacak kaliteli bir dijital alanın olmaması olduğunu fark ettik. Sosyal medya platformlarının hızlı ve geçici 
                  yapısının aksine, daha derinlikli içerikler üretebileceğimiz bir alan hayal ettik.
                </p>
                <p>
                  Bu amaçla yola çıkarak hem profesyonel bir blog sistemini hem de kampüs içi dinamikleri yansıtacak interaktif bir sözlük 
                  yapısını tek çatı altında birleştiren ZirveKampüs platformunu inşa ettik.
                </p>
              </div>
            </div>
            <div className="p-8 rounded-2xl border border-border bg-card/30 flex flex-col justify-center items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-erciyes-red to-red-900 flex items-center justify-center shadow-lg shadow-erciyes-red/10">
                <span className="text-white font-black text-2xl">Z</span>
              </div>
              <p className="text-sm font-semibold text-foreground">ZirveKampüs Bağımsız Öğrenci Projesi</p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                Sevgi ve emekle kodlandı
                <Heart className="w-3.5 h-3.5 text-erciyes-red fill-erciyes-red" />
              </div>
            </div>
          </div>
        </motion.section>

        {/* ─── BAĞIMSIZLIK BİLDİRİSİ ───────────────────────────── */}
        <motion.section variants={itemVariants} className="p-8 rounded-2xl border border-red-500/20 bg-red-500/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <ShieldAlert className="w-24 h-24 text-erciyes-red" />
          </div>
          <div className="space-y-4 relative z-10 max-w-3xl">
            <h2 className="section-heading text-2xl text-foreground flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-erciyes-red" />
              Önemli Bağımsızlık Bildirisi
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              ZirveKampüs tamamen <strong>bağımsız bir öğrenci girişimidir</strong>. Erciyes Üniversitesi Rektörlüğü, dekanlıkları, 
              öğrenci konseyi veya herhangi bir idari birimi ile <strong>hiçbir resmi, idari veya organik bağı bulunmamaktadır</strong>. 
            </p>
            <p className="text-xs text-muted-foreground/80 leading-relaxed">
              Platformda paylaşılan görüşler, makaleler ve forum entryleri tamamen yazarların kendi kişisel düşünceleridir. 
              ZirveKampüs, Anayasa'nın düşünceyi açıklama ve yayma hürriyeti kapsamında öğrencilere özgür bir ifade alanı sunmayı taahhüt eder.
            </p>
          </div>
        </motion.section>

        {/* ─── HAREKETE GEÇİRİCİ MESAJ ─────────────────────────── */}
        <motion.section variants={itemVariants} className="text-center space-y-6 border-t border-border pt-12">
          <h2 className="section-heading text-2xl text-foreground">
            Sen de Kampüsün <span className="text-erciyes-red">Sesi Ol!</span>
          </h2>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto leading-relaxed">
            Fikirlerini makaleleştirerek yazar kadromuza katılabilir veya forumda tartışmalara katılarak kampüs gündemini belirleyebilirsin.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/basvuru"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-erciyes-red-hover transition-colors shadow-lg shadow-erciyes-red/10 text-center text-sm"
            >
              Yazar Başvurusu Yap
            </Link>
            <Link
              href="/forum"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-secondary text-secondary-foreground font-semibold hover:bg-secondary/80 transition-colors border border-border text-center text-sm"
            >
              Forumda Paylaşımda Bulun
            </Link>
          </div>
        </motion.section>
      </motion.div>
    </div>
  );
}
