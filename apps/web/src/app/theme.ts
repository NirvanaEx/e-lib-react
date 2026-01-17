import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1d4d4f" },
    secondary: { main: "#c68a3f" },
    background: { default: "#f3f1ec", paper: "#ffffff" },
    text: { primary: "#1c1b19", secondary: "#7a746c" }
  },
  typography: {
    fontFamily: "Manrope, Segoe UI, sans-serif",
    h4: { fontFamily: "Source Serif 4, Times New Roman, serif", fontWeight: 700 },
    h5: { fontFamily: "Source Serif 4, Times New Roman, serif", fontWeight: 700 },
    h6: { fontFamily: "Source Serif 4, Times New Roman, serif", fontWeight: 600 }
  },
  shape: {
    borderRadius: 14
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
          borderRadius: 12
        }
      }
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: "#f3efe8"
        }
      }
    }
  }
});
