import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // shadcn/ui CSS değişken tabanlı renkler
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',

        // Erciyes Marka Renkleri
        erciyes: {
          red: {
            DEFAULT: '#e8272a',  // Parlak editorial kırmızı
            50: '#fef2f2',
            100: '#fee2e2',
            200: '#fecaca',
            300: '#fca5a5',
            400: '#f87171',
            500: '#e8272a',
            600: '#c71f22',
            700: '#a81b1e',    // Hover tonu
            800: '#8a1518',
            900: '#6b1012',
            950: '#450a0a',
          },
          gold: {
            DEFAULT: '#f59e0b',
            light: '#fbbf24',
            dark: '#d97706',
          },
        },

        // Slate/Zinc Koyu Zemin Tonları (Dark Mode)
        slate: {
          850: '#0f172a',     // Ana Arka Plan
          900: '#0f172a',
          950: '#09090b',
        },
      },

      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        serif: ['Merriweather', 'Georgia', '"Times New Roman"', 'serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],  // Editorial büyük başlıklar
        ui: ['Inter', 'sans-serif'],
        reading: ['Merriweather', 'serif'],
      },

      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },

      animation: {
        'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        shimmer: 'shimmer 1.5s infinite',
        'pulse-red': 'pulseRed 2s infinite',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
      },

      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        pulseRed: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(185, 28, 28, 0.4)' },
          '50%': { boxShadow: '0 0 0 8px transparent' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },

      transitionTimingFunction: {
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },

      backgroundImage: {
        'gradient-hero': 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
        'gradient-red': 'linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%)',
        'gradient-card': 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%)',
        'gradient-gold': 'linear-gradient(90deg, #f59e0b, #b91c1c)',
      },

      // Tasarım grid'i
      gridTemplateColumns: {
        'main': '1fr 380px',  // Masaüstü: %70 makale / %30 forum
      },

      screens: {
        xs: '480px',
      },

      boxShadow: {
        'glow-red': '0 0 20px rgba(185, 28, 28, 0.25)',
        'glow-gold': '0 0 20px rgba(245, 158, 11, 0.25)',
        'card-hover': '0 8px 30px rgba(0,0,0,0.3)',
      },
    },
  },
  plugins: [],
};

export default config;
