'use client';

import { useEffect, useRef } from 'react';
import Lenis from 'lenis';

/**
 * Lenis Smooth Scroll Provider
 * --------------------------------
 * Tüm uygulamada "butter-smooth" kaydırma deneyimi sağlar.
 * layout.tsx'te global olarak sarmalar.
 *
 * prefers-reduced-motion: Erişilebilirlik için eğer kullanıcı
 * hareketi azaltmayı tercih ediyorsa Lenis aktif edilmez.
 */
export default function LenisProvider({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    // Erişilebilirlik: Hareketi azalt tercihine saygı göster
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    lenisRef.current = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.9,
    });

    function raf(time: number) {
      lenisRef.current?.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenisRef.current?.destroy();
    };
  }, []);

  return <>{children}</>;
}
