/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: '#E23744',
        ember: '#FF7A45',
        ink: '#1F1815',
        ground: '#FCFAF8',
        panel: '#FFFFFF',
        line: '#EFE7E0',
        muted: '#7C6F67',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 3px rgba(31,24,21,.04), 0 12px 40px -12px rgba(31,24,21,.12)',
        lift: '0 20px 60px -20px rgba(226,55,68,.35)',
      },
    },
  },
  plugins: [],
};
