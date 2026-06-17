/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fefbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b', // Gold/Amber accent
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        prayer: {
          completed: '#10b981', // Emerald
          missed: '#f43f5e', // Rose
          pending: '#e2e8f0', // Light slate
          pendingDark: '#475569', // Dark slate
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
      animation: {
        'pulse-subtle': 'pulseSubtle 2s infinite ease-in-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        pulseSubtle: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.85', transform: 'scale(1.02)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      }
    },
  },
  plugins: [],
}
