import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#0f766e" },
    secondary: { main: "#f59e0b" },
    background: { default: "#f7f4ef", paper: "#ffffff" }
  },
  typography: {
    fontFamily: "Space Grotesk, Segoe UI, sans-serif",
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 }
  },
  shape: {
    borderRadius: 12
  }
});
