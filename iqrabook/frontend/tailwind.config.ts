import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // UI Theme: Red + Pink + White
        "iq-red": "#E63946",
        "iq-pink": "#FF6B8A",
        "iq-white": "#FFFFFF",
        "iq-dark": "#1A1A2E",
        "iq-darker": "#0F0F1A",
        // Book Theme: Yellow + White + Orange
        "book-yellow": "#FFD166",
        "book-white": "#FFF8F0",
        "book-orange": "#FF9F1C",
        "book-spine": "#D4A574",
      },
      fontFamily: {
        arabic: ["var(--font-amiri)", "Scheherazade New", "Amiri", "serif"],
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Merriweather", "Georgia", "serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      animation: {
        "float": "float 3s ease-in-out infinite",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "page-flip": "pageFlip 0.6s ease-in-out",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 5px rgba(230, 57, 70, 0.3)" },
          "50%": { boxShadow: "0 0 20px rgba(230, 57, 70, 0.6)" },
        },
        pageFlip: {
          "0%": { transform: "rotateY(0deg)" },
          "100%": { transform: "rotateY(-180deg)" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};

export default config;
