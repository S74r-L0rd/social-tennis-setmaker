/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Nunito', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        beige: '#faf4ec',
        coral: {
          50:  '#fff4f2',
          100: '#ffe6e1',
          200: '#ffcfc7',
          300: '#ffaa9d',
          400: '#ff7a67',
          500: '#e8503a',
          600: '#d43d28',
          700: '#b02e1c',
          800: '#922818',
          900: '#7a2415',
          950: '#42100a',
        },
      },
    },
  },
  plugins: [],
}
