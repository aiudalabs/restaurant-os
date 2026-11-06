/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Brand colors are CSS variables (rgb channels) set at runtime from the branch's
      // `branding` (src/lib/theme.ts); defaults live in src/index.css. `gold` is the
      // accent color — the name is kept so existing classes keep working.
      colors: {
        brand: {
          DEFAULT: 'rgb(var(--brand) / <alpha-value>)',
          dark: 'rgb(var(--brand-dark) / <alpha-value>)',
          tint: 'rgb(var(--brand-tint) / <alpha-value>)',
          mist: 'rgb(var(--brand-mist) / <alpha-value>)',
        },
        gold: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          dark: 'rgb(var(--accent-dark) / <alpha-value>)',
          light: 'rgb(var(--accent-light) / <alpha-value>)',
          tint: 'rgb(var(--accent-tint) / <alpha-value>)',
          ink: 'rgb(var(--accent-ink) / <alpha-value>)',
        },
        // Neutrals and semantic colors are NOT customizable (legibility).
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
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
