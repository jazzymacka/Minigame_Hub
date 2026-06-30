/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: "#0A0D14",
        surface: "#12161F",
        elevated: "#1A1F2C",
        border: "#232A3A",
        accent: {
          DEFAULT: "#4F8CFF",
          dim: "#2F5FCC",
          glow: "#7CA8FF",
        },
        ink: {
          DEFAULT: "#E7EAF1",
          muted: "#8A93A6",
          faint: "#5B6478",
        },
        success: "#34D399",
        danger: "#F87171",
        warning: "#FBBF24",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "system-ui", "sans-serif"],
        sans: ["'Inter'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(79,140,255,0.25), 0 8px 30px -8px rgba(79,140,255,0.35)",
        card: "0 4px 20px -4px rgba(0,0,0,0.5)",
      },
      keyframes: {
        "fade-in": { from: { opacity: 0 }, to: { opacity: 1 } },
        "slide-up": { from: { opacity: 0, transform: "translateY(8px)" }, to: { opacity: 1, transform: "translateY(0)" } },
        "scale-in": { from: { opacity: 0, transform: "scale(0.96)" }, to: { opacity: 1, transform: "scale(1)" } },
        "pulse-ring": {
          "0%": { boxShadow: "0 0 0 0 rgba(79,140,255,0.5)" },
          "70%": { boxShadow: "0 0 0 10px rgba(79,140,255,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(79,140,255,0)" },
        },
        countdown: {
          "0%": { opacity: 0, transform: "scale(0.5)" },
          "20%": { opacity: 1, transform: "scale(1.1)" },
          "80%": { opacity: 1, transform: "scale(1)" },
          "100%": { opacity: 0, transform: "scale(0.85)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.25s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        "pulse-ring": "pulse-ring 2s infinite",
        countdown: "countdown 1s ease-in-out",
      },
    },
  },
  plugins: [],
};
