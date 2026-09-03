/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        forest: {
          50: '#f0f7f2',
          100: '#dbeee2',
          200: '#b8ddc8',
          300: '#88c4a7',
          400: '#5aa484',
          500: '#3d8668',
          600: '#2d6b53',
          700: '#245543',
          800: '#1e4436',
          900: '#163028',
          950: '#0d1f1a',
        },
        clay: {
          50: '#fdf5f0',
          100: '#f9e4d7',
          200: '#f2c8b0',
          300: '#e8a380',
          400: '#dc7855',
          500: '#c95c3a',
          600: '#b04a2e',
          700: '#913c27',
          800: '#763324',
          900: '#622c20',
        },
        wood: {
          50: '#faf7f2',
          100: '#f0e9df',
          200: '#e0d2bf',
          300: '#ccb59c',
          400: '#b89878',
          500: '#a67e5e',
          600: '#8d674d',
          700: '#735340',
          800: '#5e4435',
          900: '#4d382c',
        },
        cream: {
          50: '#fefdfb',
          100: '#faf8f3',
          200: '#f5f0e6',
          300: '#ede4d4',
          400: '#dfd2bc',
          500: '#ccbaa0',
        },
        ball: {
          50: '#fdfef0',
          100: '#fafde0',
          200: '#f3faa8',
          300: '#e9f570',
          400: '#dcef4a',
          500: '#c7e83a',
          600: '#aacc2e',
          700: '#84a626',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 2px 12px -2px rgba(22, 48, 40, 0.08), 0 1px 4px -1px rgba(22, 48, 40, 0.06)',
        card: '0 4px 24px -6px rgba(22, 48, 40, 0.12), 0 2px 8px -2px rgba(22, 48, 40, 0.08)',
        lift: '0 12px 40px -8px rgba(22, 48, 40, 0.18), 0 4px 12px -4px rgba(22, 48, 40, 0.10)',
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.4s ease-out both',
        scaleIn: 'scaleIn 0.2s ease-out both',
        slideUp: 'slideUp 0.5s ease-out both',
      },
    },
  },
  plugins: [],
};
