/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Pick & Eat palette (mockup «Pick & Eat Club»).
      colors: {
        brand: {
          DEFAULT: '#3F6B2A',
          dark: '#2E5120',
          tint: '#E8F0E1',
          mist: '#D9E6CF',
        },
        gold: {
          DEFAULT: '#C9A24A',
          dark: '#A8832F',
          light: '#F5D98A',
          tint: '#F1E6C8',
          ink: '#6E5412',
        },
        surface: '#FAF8F2',
        ink: '#141414',
        hint: '#6B6B66',
        line: '#E6E2D8',
        danger: '#B3261E',
      },
      borderRadius: {
        xl: '14px',
        '2xl': '18px',
        '3xl': '20px',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
