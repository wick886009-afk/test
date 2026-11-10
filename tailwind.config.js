/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        gleva: {
          ivory: '#FFF8F0',
          charcoal: '#171717',
          burgundy: '#881337',
          coral: '#EF4444',
          blush: '#FFE4E6',
          gold: '#D4A373'
        }
      },
      fontFamily: {
        sans: ['Geist', 'Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace']
      },
      boxShadow: {
        'glass': '0 20px 50px -12px rgba(23, 23, 23, 0.12), 0 0 1px 1px rgba(136, 19, 55, 0.06)',
        'glass-dark': '0 24px 60px -15px rgba(0, 0, 0, 0.65), 0 0 1px 1px rgba(255, 228, 230, 0.08)',
        'burgundy-glow': '0 12px 32px -8px rgba(136, 19, 55, 0.45)'
      }
    }
  },
  plugins: []
};
