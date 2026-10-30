/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        voyager: {
          light: '#f8fafc',
          dark: '#020617',
          cardLight: '#ffffff',
          cardDark: '#0b0f19',
        },
      },
    },
  },
  plugins: [],
}

