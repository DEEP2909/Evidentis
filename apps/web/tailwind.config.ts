import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        // EvidentIS Brand Colors
        navy: {
          DEFAULT: '#050e1f',
          light: '#0d1e3a',
          50: '#E8EBF0',
          100: '#C5CCD9',
          200: '#9EAABF',
          300: '#7789A6',
          400: '#5A6F93',
          500: '#3D5580',
          600: '#2D426A',
          700: '#1E2F54',
          800: '#0d1e3a',
          900: '#050e1f',
          950: '#020912',
        },
        gold: {
          DEFAULT: '#C9A84C',
          light: '#E8C97A',
          dark: '#A88B3D',
          50: '#FCF8ED',
          100: '#F7EDCC',
          200: '#F0DDA7',
          300: '#E8C97A',
          400: '#C9A84C',
          500: '#A88B3D',
          600: '#876F31',
          700: '#665425',
          800: '#45391A',
          900: '#241D0D',
        },
        // Risk Level Colors
        critical: { DEFAULT: '#DC2626', light: '#FEE2E2' },
        high:     { DEFAULT: '#EA580C', light: '#FFEDD5' },
        medium:   { DEFAULT: '#D97706', light: '#FEF3C7' },
        low:      { DEFAULT: '#16A34A', light: '#DCFCE7' },
        saffron: {
          300: '#FFCF8C',
          400: '#FFD18B',
          500: '#FF9933',
          600: '#F07A00',
        },
        'india-green': '#138808',
        // Radix UI semantic tokens
        border:      'hsl(var(--border))',
        input:       'hsl(var(--input))',
        ring:        'hsl(var(--ring))',
        background:  'hsl(var(--background))',
        foreground:  'hsl(var(--foreground))',
        primary: {
          DEFAULT:    'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT:    'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT:    'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT:    'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT:    'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT:    'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT:    'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      fontFamily: {
        sans:  ['Sora', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['Cormorant Garamond', 'Georgia', 'Cambria', 'Times New Roman', 'serif'],
        mono:  ['Cascadia Mono', 'Consolas', 'Courier New', 'monospace'],
      },
      fontSize: {
        'display-2xl': ['4.5rem',  { lineHeight: '1.08', letterSpacing: '-0.025em' }],
        'display-xl':  ['3.75rem', { lineHeight: '1.1',  letterSpacing: '-0.02em' }],
        'display-lg':  ['3rem',    { lineHeight: '1.14', letterSpacing: '-0.018em' }],
        'display-md':  ['2.25rem', { lineHeight: '1.2',  letterSpacing: '-0.015em' }],
        'display-sm':  ['1.875rem',{ lineHeight: '1.26', letterSpacing: '-0.012em' }],
      },
      borderRadius: {
        lg:  'var(--radius)',
        md:  'calc(var(--radius) - 2px)',
        sm:  'calc(var(--radius) - 4px)',
        xl:  'calc(var(--radius) + 4px)',
        '2xl': '1.5rem',
        '3xl': '2rem',
        '4xl': '2.5rem',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '72': '18rem',
        '80': '20rem',
        '88': '22rem',
        '96': '24rem',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to:   { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to:   { height: '0' },
        },
        shimmer: {
          from: { backgroundPosition: '-200% center' },
          to:   { backgroundPosition:  '200% center' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '.5' },
        },
        pageEnter: {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          from: { opacity: '0', transform: 'translateX(-22px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        slideInRight: {
          from: { opacity: '0', transform: 'translateX(22px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.94)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0) translateX(0)' },
          '33%':      { transform: 'translateY(-10px) translateX(5px)' },
          '66%':      { transform: 'translateY(-4px) translateX(-4px)' },
        },
        marquee: {
          from: { transform: 'translateX(0)' },
          to:   { transform: 'translateX(-50%)' },
        },
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to:   { transform: 'rotate(360deg)' },
        },
        glowPulse: {
          from: { boxShadow: '0 0 12px rgba(255,153,51,0.14), 0 0 24px rgba(255,153,51,0.07)' },
          to:   { boxShadow: '0 0 24px rgba(255,153,51,0.36), 0 0 48px rgba(255,153,51,0.16)' },
        },
        countUp: {
          from: { opacity: '0', transform: 'translateY(10px) scale(0.95)' },
          to:   { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        textShimmer: {
          '0%':   { backgroundPosition: '0% center' },
          '100%': { backgroundPosition: '200% center' },
        },
      },
      animation: {
        'accordion-down':  'accordion-down 0.2s ease-out',
        'accordion-up':    'accordion-up 0.2s ease-out',
        shimmer:           'shimmer 4s ease-in-out infinite',
        pulse:             'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'page-enter':      'pageEnter 0.45s cubic-bezier(0.22,1,0.36,1) both',
        'fade-up':         'fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both',
        'slide-in-left':   'slideInLeft 0.4s cubic-bezier(0.22,1,0.36,1) both',
        'slide-in-right':  'slideInRight 0.4s cubic-bezier(0.22,1,0.36,1) both',
        'scale-in':        'scaleIn 0.35s cubic-bezier(0.22,1,0.36,1) both',
        float:             'float 7s ease-in-out infinite',
        marquee:           'marquee 26s linear infinite',
        'spin-slow':       'spin-slow 90s linear infinite',
        'spin-slow-fast':  'spin-slow 22s linear infinite',
        'glow-pulse':      'glowPulse 2.4s ease-in-out infinite alternate',
        'count-up':        'countUp 0.7s cubic-bezier(0.22,1,0.36,1) both',
        'text-shimmer':    'textShimmer 3.5s linear infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
