import { createTheme } from "@mui/material/styles";
import type { ThemeMode, ThemeStyle } from "../shared/hooks/useThemeMode";
import { GLASS_OPACITY_DEFAULT, glassSurfaceAlpha } from "../shared/hooks/useThemeMode";

// Base RGB of glass panels; must match the --surface colors in index.css.
const GLASS_PAPER_RGB = { light: "255, 255, 255", dark: "120, 165, 225" };
// Subtle top-light sheen so panels read as glass even over a plain background.
const GLASS_SHEEN = {
  light: "linear-gradient(155deg, rgba(255, 255, 255, 0.55) 0%, rgba(255, 255, 255, 0.12) 100%)",
  dark: "linear-gradient(155deg, rgba(255, 255, 255, 0.09) 0%, rgba(255, 255, 255, 0.015) 65%)"
};
// Floating surfaces (dialogs, menus) need more opacity to stay readable.
const GLASS_OVERLAY = { light: "rgba(255, 255, 255, 0.9)", dark: "rgba(13, 26, 48, 0.92)" };
// The sidebar can stay more transparent — behind it is just the page backdrop.
const GLASS_DRAWER = { light: "rgba(255, 255, 255, 0.6)", dark: "rgba(9, 20, 40, 0.62)" };

const glassSurface = {
  backdropFilter: "blur(18px) saturate(160%)",
  WebkitBackdropFilter: "blur(18px) saturate(160%)"
};

export function createAppTheme(mode: ThemeMode, style: ThemeStyle = "glass", glassOpacity: number = GLASS_OPACITY_DEFAULT) {
  const dark = mode === "dark";
  const glass = style === "glass";
  const paper = glass
    ? `rgba(${dark ? GLASS_PAPER_RGB.dark : GLASS_PAPER_RGB.light}, ${glassSurfaceAlpha(mode, glassOpacity).toFixed(3)})`
    : dark
      ? "#111f36"
      : "#ffffff";
  const overlay = dark ? GLASS_OVERLAY.dark : GLASS_OVERLAY.light;
  return createTheme({
    palette: {
      mode,
      primary: { main: dark ? "#3b82f6" : "#2563eb" },
      secondary: { main: dark ? "#38bdf8" : "#0ea5e9" },
      background: {
        default: dark ? "#0b1424" : "#f5f7fb",
        paper
      },
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
            backgroundImage: glass ? (dark ? GLASS_SHEEN.dark : GLASS_SHEEN.light) : "none",
            boxShadow: "none",
            ...(glass ? glassSurface : {})
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
      },
      ...(glass
        ? {
            MuiDialog: { styleOverrides: { paper: { backgroundColor: overlay } } },
            MuiDrawer: {
              styleOverrides: {
                paper: { backgroundColor: dark ? GLASS_DRAWER.dark : GLASS_DRAWER.light }
              }
            },
            MuiMenu: { styleOverrides: { paper: { backgroundColor: overlay } } },
            MuiPopover: { styleOverrides: { paper: { backgroundColor: overlay } } },
            MuiAutocomplete: { styleOverrides: { paper: { backgroundColor: overlay } } }
          }
        : {})
    }
  });
}

export const theme = createAppTheme("light");
