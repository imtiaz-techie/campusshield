/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#111827', 700: '#1F2937', 800: '#151E2E', 900: '#0B1120' },
        brand: { DEFAULT: '#2563EB', 50: '#EFF6FF', 100: '#DBEAFE', 500: '#3B82F6', 600: '#2563EB', 700: '#1D4ED8' },
        emergency: { DEFAULT: '#DC2626', 50: '#FEF2F2', 100: '#FEE2E2', 500: '#EF4444', 600: '#DC2626', 700: '#B91C1C' },
        warning: { DEFAULT: '#F59E0B', 50: '#FFFBEB', 100: '#FEF3C7', 700: '#B45309' },
        success: { DEFAULT: '#16A34A', 50: '#F0FDF4', 100: '#DCFCE7', 700: '#15803D' },
        surface: '#F8FAFC',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,.04), 0 1px 3px rgba(16,24,40,.08)',
        lift: '0 10px 30px -12px rgba(17,24,39,.25)',
      },
      keyframes: {
        pulsering: { '0%': { transform: 'scale(.95)', opacity: '.6' }, '100%': { transform: 'scale(1.7)', opacity: '0' } },
        fadein: { '0%': { opacity: '0', transform: 'translateY(6px)' }, '100%': { opacity: '1', transform: 'none' } },
      },
      animation: {
        pulsering: 'pulsering 1.8s cubic-bezier(.2,.6,.4,1) infinite',
        fadein: 'fadein .25s ease-out',
      },
    },
  },
  plugins: [],
};
