/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        court: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        clay: {
          50: '#fdf4ed',
          100: '#fbe3d3',
          200: '#f6c4a8',
          300: '#f09b73',
          400: '#e86a3d',
          500: '#d94a23',
          600: '#bf371a',
          700: '#9c2c18',
          800: '#7c2619',
          900: '#632217',
        },
        limeball: {
          400: '#d9f441',
          500: '#c7e83a',
          600: '#aacc2e',
        },
        ink: {
          50: '#f0f6f4',
          100: '#dceae5',
          200: '#bbd3cb',
          300: '#8fb3a6',
          400: '#5d8a7c',
          500: '#3f6b5d',
          600: '#2f5547',
          700: '#264439',
          800: '#1e362d',
          900: '#14241e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 2px 12px -2px rgba(20, 36, 30, 0.08), 0 1px 4px -1px rgba(20, 36, 30, 0.06)',
        card: '0 4px 24px -6px rgba(20, 36, 30, 0.12), 0 2px 8px -2px rgba(20, 36, 30, 0.08)',
        lift: '0 12px 40px -8px rgba(20, 36, 30, 0.18), 0 4px 12px -4px rgba(20, 36, 30, 0.10)',
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
