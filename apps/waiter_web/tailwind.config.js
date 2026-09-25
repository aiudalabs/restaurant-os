/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#FAF7F4',
        panel: '#FFFFFF',
        line: '#ECE5DE',
        ink: '#1F1A17',
        muted: '#7A6F66',
        brand: '#E23744',
        brandDark: '#B8232F',
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
