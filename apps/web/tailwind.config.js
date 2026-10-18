/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        // Storefront home page only (see pages/Storefront.tsx).
        shop: ["Montserrat", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ['"Caveat Brush"', "cursive"],
        // Project overview page only (see pages/Project.tsx).
        heading: ["Rajdhani", "ui-sans-serif", "system-ui", "sans-serif"],
        site: ["Poppins", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        // Driven by CSS variables (styles/index.css): dark by default, light inside `.pro`
        // (the price app). Overrides Tailwind's slate so every slate-* class follows the theme.
        slate: {
          50: "rgb(var(--slate-50) / <alpha-value>)",
          100: "rgb(var(--slate-100) / <alpha-value>)",
          200: "rgb(var(--slate-200) / <alpha-value>)",
          300: "rgb(var(--slate-300) / <alpha-value>)",
          400: "rgb(var(--slate-400) / <alpha-value>)",
          500: "rgb(var(--slate-500) / <alpha-value>)",
          600: "rgb(var(--slate-600) / <alpha-value>)",
          700: "rgb(var(--slate-700) / <alpha-value>)",
          800: "rgb(var(--slate-800) / <alpha-value>)",
          900: "rgb(var(--slate-900) / <alpha-value>)",
          950: "rgb(var(--slate-950) / <alpha-value>)",
        },
        // Brand accent (indigo). Overrides sky so existing sky-* classes (buttons, links,
        // focus rings) take the brand color.
        sky: {
          50: "rgb(var(--sky-50) / <alpha-value>)",
          100: "rgb(var(--sky-100) / <alpha-value>)",
          200: "rgb(var(--sky-200) / <alpha-value>)",
          300: "rgb(var(--sky-300) / <alpha-value>)",
          400: "rgb(var(--sky-400) / <alpha-value>)",
          500: "rgb(var(--sky-500) / <alpha-value>)",
          600: "rgb(var(--sky-600) / <alpha-value>)",
          700: "rgb(var(--sky-700) / <alpha-value>)",
          800: "rgb(var(--sky-800) / <alpha-value>)",
          900: "rgb(var(--sky-900) / <alpha-value>)",
          950: "rgb(var(--sky-950) / <alpha-value>)",
        },
        // Storefront palette: royal blue + navy ink on a light page.
        shop: {
          blue: "#2849a8",
          ink: "#212a39",
          mist: "#f7f7f7",
        },
        // Overview palette. `orange` is for decoration and text on dark; `deep` passes AA
        // for white text on it and for text on white.
        site: {
          orange: "#f97316",
          deep: "#c2410c",
          navy: "#14284b",
          ink: "#171717",
        },
        significance: {
          noise: "#94a3b8",
          minor: "#60a5fa",
          moderate: "#facc15",
          major: "#fb923c",
          critical: "#f87171",
        },
      },
      boxShadow: {
        card: "0 1px 0 0 rgb(255 255 255 / 0.03) inset, 0 8px 24px -12px rgb(0 0 0 / 0.6)",
        glow: "0 0 0 1px rgb(107 114 242 / 0.35), 0 8px 30px -8px rgb(107 114 242 / 0.35)",
      },
      keyframes: {
        sweep: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      animation: {
        sweep: "sweep 3s linear infinite",
      },
    },
  },
  plugins: [],
};
