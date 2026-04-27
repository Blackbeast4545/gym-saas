/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html','./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT:'#10B981', dark:'#059669', light:'#ECFDF5' },
      },
      fontFamily: { sans: ['Inter','system-ui','sans-serif'] },
    },
  },
  plugins: [],
}
