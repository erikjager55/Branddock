import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#10B981",
          50: "#E8F9F2",
          100: "#D1F4E6",
          200: "#A3E9CC",
          300: "#75DEB3",
          400: "#47D399",
          500: "#10B981",
          600: "#0D9467",
          700: "#0A6F4D",
          800: "#074A34",
          900: "#03251A",
        },
        background: {
          DEFAULT: "#FFFFFF",
          dark: "#0F172A",
        },
        surface: {
          DEFAULT: "#F8FAFC",
          dark: "#1E293B",
        },
        border: {
          DEFAULT: "#E2E8F0",
          dark: "#334155",
        },
        text: {
          DEFAULT: "#0F172A",
          dark: "#F8FAFC",
        },
      },
      spacing: {
        // 4px grid system
        "0.5": "2px",
        "1": "4px",
        "2": "8px",
        "3": "12px",
        "4": "16px",
        "5": "20px",
        "6": "24px",
        "8": "32px",
        "10": "40px",
        "12": "48px",
        "16": "64px",
        "20": "80px",
        "24": "96px",
        "32": "128px",
        "64": "256px", // sidebar expanded
      },
      borderRadius: {
        DEFAULT: "6px",
        sm: "4px",
        md: "6px",
        lg: "8px",
        xl: "12px",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      maxWidth: {
        content: "1200px",
      },
    },
  },
  plugins: [],
};

export default config;
