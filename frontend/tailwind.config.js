/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  theme: {
    extend: {
      colors: {
        border: "#D4AF37",
        input: "#D4AF37",
        ring: "#D4AF37",
        background: "#F7F3EA",
        foreground: "#1A1A1A",
        primary: {
          DEFAULT: "#1A1A1A",
          foreground: "#F7F3EA",
        },
        secondary: {
          DEFAULT: "#F2EBDD",
          foreground: "#1A1A1A",
        },
        destructive: {
          DEFAULT: "#991B1B",
          foreground: "#F7F3EA",
        },
        muted: {
          DEFAULT: "#F2EBDD",
          foreground: "#5B5B5B",
        },
        accent: {
          DEFAULT: "#D4AF37",
          foreground: "#FFFFFF",
        },
        popover: {
          DEFAULT: "#FBF7F0",
          foreground: "#1A1A1A",
        },
        card: {
          DEFAULT: "#FBF7F0",
          foreground: "#1A1A1A",
        },
        gold: "#D4AF37",
        ivory: "#F7F3EA",
        champagne: "#F2EBDD",
        pearl: "#FBF7F0",
        charcoal: "#1A1A1A",
        graphite: "#5B5B5B",
        midnight: "#1E3D59",
      },
      fontFamily: {
        serif: ['Marcellus', 'serif'],
        sans: ['Josefin Sans', 'sans-serif'],
        mono: ['Space Mono', 'monospace'],
      },
      borderRadius: {
        lg: "0",
        md: "0",
        sm: "0",
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
