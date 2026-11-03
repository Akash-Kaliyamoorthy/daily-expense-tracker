/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        // Both families are bundled from npm (@fontsource) so the strict
        // Content-Security-Policy (no external font hosts) is respected.
        sans: ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Fraunces Variable"', 'Georgia', 'ui-serif', 'serif'],
      },
      colors: {
        // Ink-indigo: the colour of a ledger pen. Main brand colour.
        ink: {
          50: '#f3f4fa',
          100: '#e4e6f3',
          200: '#c9cde8',
          300: '#a0a8d4',
          400: '#6f7ab8',
          500: '#4a569c',
          600: '#363f82',
          700: '#2a3268',
          800: '#1f2552',
          900: '#171b3d',
          950: '#0d1022',
        },
        // Marigold: used sparingly, only for "what you can spend today".
        marigold: {
          200: '#fbe7a6',
          300: '#f7cf62',
          400: '#f2b92b',
          500: '#e8a317',
          600: '#c58409',
        },
        paper: '#f3f4f7',
        night: { card: '#151934', line: '#262c55' },
        // Budget status colours (shades chosen for AA contrast on both themes).
        ok: { 50: '#eaf6ef', 500: '#2f8f5b', 600: '#277a4d', 700: '#1f6340' },
        warn: { 50: '#fdf3dc', 500: '#d98e04', 600: '#b87500', 700: '#8f5b00' },
        bad: { 50: '#fcebe8', 500: '#c8402f', 600: '#ab3324', 700: '#8a281c' },
      },
      borderRadius: {
        // Different roles get different radii: controls < panels < sheets.
        control: '10px',
        panel: '14px',
        sheet: '22px',
      },
      boxShadow: {
        sheet: '0 24px 60px -12px rgba(13, 16, 34, 0.45)',
      },
    },
  },
  plugins: [],
};
