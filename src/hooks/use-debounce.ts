'use client';

import { useEffect, useRef } from 'react';
import { useState } from 'react';

/**
 * Debounce Hook
 * ─────────────
 * Hızlı değişen değerleri (örn. arama input'u) belirtilen
 * gecikmeyle yavaşlatır. Gereksiz API çağrılarını önler.
 *
 * @param value - İzlenecek değer
 * @param delay - Milisaniye cinsinden gecikme süresi
 *
 * @example
 * const debouncedQuery = useDebounce(searchQuery, 300);
 * // debouncedQuery, searchQuery'nin 300ms sonra güncellenen hali
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
