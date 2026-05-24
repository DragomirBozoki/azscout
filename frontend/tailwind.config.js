/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        "text-1": "var(--text-1)",
        "text-2": "var(--text-2)",
        "text-3": "var(--text-3)",
        "teal-50": "var(--teal-50)",
        "teal-600": "var(--teal-600)",
        "teal-700": "var(--teal-700)",
        "teal-800": "var(--teal-800)",
        "red-50": "var(--red-50)",
        "red-700": "var(--red-700)",
        "red-800": "var(--red-800)",
        "amber-50": "var(--amber-50)",
        "amber-700": "var(--amber-700)",
        "green-50": "var(--green-50)",
        "green-800": "var(--green-800)",
        "gray-50": "var(--gray-50)",
        "gray-700": "var(--gray-700)",
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
      },
      borderWidth: {
        hairline: "0.5px",
      },
      fontWeight: {
        normal: "400",
        medium: "500",
      },
    },
  },
  plugins: [],
}
