import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    screens: {
      xs: "420px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px"
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        accent: "hsl(var(--accent))",
        "accent-foreground": "hsl(var(--accent-foreground))",
        surface: "hsl(var(--surface))",
        violet: {
          DEFAULT: "#8b5cf6",
          soft: "#a78bfa",
          deep: "#6d28d9"
        },
        ink: {
          950: "#050505",
          900: "#0a0a0c",
          800: "#101014"
        }
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"]
      },
      letterSpacing: {
        tightest: "-0.045em"
      },
      boxShadow: {
        panel: "0 1px 2px rgba(15, 23, 42, 0.08), 0 12px 32px rgba(15, 23, 42, 0.06)",
        glow: "0 0 0 1px rgba(139, 92, 246, 0.18), 0 0 60px -10px rgba(139, 92, 246, 0.45)"
      },
      animation: {
        "reveal-up": "revealUp 0.9s cubic-bezier(0.16, 1, 0.3, 1) both",
        "reveal-fade": "revealFade 1s ease-out both",
        "grid-drift": "gridDrift 24s linear infinite",
        "pulse-slow": "pulseSlow 4s ease-in-out infinite",
        "scan": "scan 6s ease-in-out infinite",
        "marquee": "marquee 28s linear infinite"
      },
      keyframes: {
        revealUp: {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        revealFade: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" }
        },
        gridDrift: {
          "0%": { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "80px 80px" }
        },
        pulseSlow: {
          "0%, 100%": { opacity: "0.35" },
          "50%": { opacity: "0.65" }
        },
        scan: {
          "0%, 100%": { transform: "translateY(-100%)" },
          "50%": { transform: "translateY(100%)" }
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" }
        }
      }
    }
  },
  plugins: []
};

export default config;
