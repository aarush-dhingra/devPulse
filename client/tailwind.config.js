/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#000000",
          panel: "#070707",
          card: "#0a0a0a",
          deep: "#000000",
          elev: "#111111",
        },
        line: {
          DEFAULT: "rgba(255, 255, 255, 0.06)",
          strong: "rgba(255, 255, 255, 0.14)",
        },
        accent: {
          DEFAULT: "#8b5cf6",
          50: "#f3eeff",
          100: "#e2d6ff",
          200: "#c2a8ff",
          300: "#a17cff",
          400: "#9067ff",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
        },
        cyan: {
          400: "#22d3ee",
          500: "#06b6d4",
        },
        good: "#10b981",
        bad: "#ef4444",
        warn: "#f59e0b",
        ink: {
          DEFAULT: "#e8ecff",
          muted: "#a3a8c3",
          dim: "#6b7090",
          faint: "#3d4368",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["'Space Grotesk'", "Inter", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(139, 92, 246, 0.35), 0 12px 40px rgba(139, 92, 246, 0.22)",
        "glow-cyan": "0 0 0 1px rgba(34, 211, 238, 0.4), 0 12px 32px rgba(34, 211, 238, 0.20)",
        soft: "0 1px 0 rgba(255,255,255,0.05) inset, 0 0 0 1px rgba(255,255,255,0.05)",
        deep: "0 18px 60px -20px rgba(0,0,0,0.6)",
      },
      backgroundImage: {
        "grid-fade":
          "linear-gradient(180deg, rgba(124,92,255,0.06) 0%, transparent 60%)",
        "noise":
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><filter id='n'><feTurbulence baseFrequency='0.85' /></filter><rect width='100' height='100' filter='url(%23n)' opacity='0.04' /></svg>\")",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          from: { opacity: "0", transform: "translateX(-8px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.7" },
          "50%": { opacity: "1" },
        },
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.4s ease-out both",
        slideIn: "slideIn 0.35s ease-out both",
        pulseGlow: "pulseGlow 2.4s ease-in-out infinite",
        scan: "scan 4s linear infinite",
        float: "float 4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
