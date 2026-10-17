import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forest: "#243D32",
        ivory: "#F5F3EB",
        sage: "#789477",
        eucalyptus: "#E2E8D9",
        sand: "#E7E1D5",
        copper: "#A87550",
        ink: "#252923",
        muted: "#777D75",
      },
      fontFamily: {
        serif: ['"DM Serif Display"', "Georgia", "serif"],
        sans: ['"DM Sans"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
