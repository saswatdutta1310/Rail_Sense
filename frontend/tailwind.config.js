/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1A56A0',
        navy: '#0F3460',
        midBlue: '#2E75B6',
        accentBlue: '#E8F0FB',
        lightBlue: '#D6E4F7',
        success: '#1A7A4A',
        warning: '#D46B08',
        danger: '#C0392B',
        neutralDark: '#4A5568',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
