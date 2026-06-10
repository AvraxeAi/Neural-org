/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        accent: '#10b981',
        'accent-dark': '#34d399',
        canvas: '#0b0b0b',
        surface: '#161616',
        'surface-sub': '#0f0f0f',
        'surface-raise': '#1e1e1e',
      },
      borderRadius: {
        DEFAULT: '8px',
        sm: '6px',
        lg: '12px',
        xl: '16px',
      },
    },
  },
  plugins: [],
}
