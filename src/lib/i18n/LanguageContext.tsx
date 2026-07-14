'use client';

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { DICTIONARIES, type Language } from './dictionaries';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (keyPath: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'tr',
  setLanguage: () => {},
  t: (key) => key,
});

export const useTranslation = () => useContext(LanguageContext);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('tr');

  // Sayfa yüklendiğinde kullanıcının tercihini localStorage'dan çek
  useEffect(() => {
    const savedLang = localStorage.getItem('language') as Language;
    if (savedLang && (savedLang === 'tr' || savedLang === 'en' || savedLang === 'fr' || savedLang === 'ru')) {
      setLanguageState(savedLang);
    } else {
      // Tarayıcı dilini kontrol edip varsayılan atayabiliriz
      const browserLang = navigator.language.slice(0, 2);
      if (['tr', 'en', 'fr', 'ru'].includes(browserLang)) {
        setLanguageState(browserLang as Language);
      }
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
    // document.documentElement.lang özniteliğini güncelle
    document.documentElement.lang = lang;
  };

  // Nested key'leri (örn: "nav.home") okumak için yardımcı fonksiyon
  const t = (keyPath: string): string => {
    const keys = keyPath.split('.');
    let result: any = DICTIONARIES[language] || DICTIONARIES['tr'];

    for (const key of keys) {
      if (result && result[key] !== undefined) {
        result = result[key];
      } else {
        // Çeviri bulunamazsa Türkçe karşılığını dene
        let fallback: any = DICTIONARIES['tr'];
        for (const fKey of keys) {
          if (fallback && fallback[fKey] !== undefined) {
            fallback = fallback[fKey];
          } else {
            fallback = keyPath; // Hiç bulunamazsa keyPath'i döndür
            break;
          }
        }
        return fallback;
      }
    }

    return typeof result === 'string' ? result : keyPath;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}
