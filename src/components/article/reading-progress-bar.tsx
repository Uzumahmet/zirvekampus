'use client';

import { useEffect, useRef } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';

/**
 * Makale Okuma İlerleme Çubuğu
 * ─────────────────────────────
 * Sayfanın en üstüne sabitlenmiş, Erciyes Kırmızısı → Altın renk geçişli
 * ince çubuk. Kullanıcının sayfada ne kadar ilerlediğini gösterir.
 * Framer Motion useScroll + useSpring ile pürüzsüz animasyon.
 */
export default function ReadingProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <motion.div
      className="reading-progress-bar"
      style={{ scaleX }}
      aria-hidden="true"
    />
  );
}
