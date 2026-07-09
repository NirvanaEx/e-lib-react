import { createTheme } from "@mui/material/styles";
import type { ThemeMode } from "../shared/hooks/useThemeMode";

export function createAppTheme(mode: ThemeMode) {
  const dark = mode === "dark";
  return createTheme({
    palette: {
      mode,
      primary: { main: dark ? "#3b82f6" : "#2563eb" },
      secondary: { main: dark ? "#38bdf8" : "#0ea5e9" },
      background: dark
        ? { default: "#0b1424", paper: "#111f36" }
        : { default: "#f5f7fb", paper: "#ffffff" },
      text: dark
        ? { primary: "#e2e8f0", secondary: "#94a3b8" }
        : { primary: "#16233d", secondary: "#64748b" },
      divider: dark ? "rgba(148, 163, 184, 0.18)" : "#e4e9f2"
    },
    typography: {
      fontFamily: "Manrope, Segoe UI, sans-serif",
      h4: { fontWeight: 800, letterSpacing: "-0.02em", fontSize: "1.5rem" },
      h5: { fontWeight: 700, letterSpacing: "-0.01em", fontSize: "1.2rem" },
      h6: { fontWeight: 700, fontSize: "1.02rem" },
      subtitle1: { fontSize: "0.95rem" },
      body1: { fontSize: "0.95rem" },
      body2: { fontSize: "0.85rem" }
    },
    shape: {
      borderRadius: 8
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            boxShadow: "none"
          }
        }
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: "none",
            fontWeight: 600,
            borderRadius: 8
          }
        }
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            backgroundColor: dark ? "#16233d" : "#f1f5fb"
          }
        }
      }
    }
  });
}

export const theme = createAppTheme("light");
