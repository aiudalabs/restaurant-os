/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0B0F14',
        panel: '#141A22',
        panel2: '#1C242E',
        line: '#2A3542',
        ink: '#EAF1F8',
        muted: '#8CA0B3',
        brand: '#E23744',
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
