/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"Noto Sans SC"', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', '"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
      colors: {
        surface: {
          DEFAULT: '#F3F6F9',
          dark: '#0B1220',
        },
        ink: {
          DEFAULT: '#0F172A',
          muted: '#64748B',
        },
        accent: {
          DEFAULT: '#0EA5E9',
          hover: '#0284C7',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.45s ease-out',
        'fade-in-slow': 'fadeIn 0.7s ease-out',
        spin: 'spin 0.8s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      boxShadow: {
        soft: '0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.04)',
      },
    },
  },
  plugins: [],
};
