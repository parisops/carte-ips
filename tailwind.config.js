/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        encre: {
          950: "#12203A",
          800: "#1E3A5F",
          600: "#2F5A8C",
          400: "#6C93BE",
        },
        craie: {
          600: "#C4562F",
          100: "#FBE7DC",
        },
        tableau: {
          700: "#2F6B4F",
          100: "#E4EFE8",
        },
        sable: {
          50: "#FAF7F0",
          100: "#F3EEE1",
          200: "#E8DFCB",
        },
        craie_jaune: {
          500: "#D9A441",
        },
      },
      fontFamily: {
        display: ["'Fraunces'", "serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      boxShadow: {
        panel: "0 8px 30px -12px rgba(18, 32, 58, 0.25)",
      },
      keyframes: {
        atterrissage: {
          "0%": { transform: "translateY(-10px)", opacity: "0" },
          "60%": { transform: "translateY(2px)", opacity: "1" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
