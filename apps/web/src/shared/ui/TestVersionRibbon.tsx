import { Box } from "@mui/material";
import ScienceOutlinedIcon from "@mui/icons-material/ScienceOutlined";
import { useTranslation } from "react-i18next";

export const TEST_RIBBON_HEIGHT = 18;

/**
 * Compact status line that occupies its own space above the application
 * header, so it never covers navigation or page content.
 */
export function TestVersionRibbon() {
  const { t } = useTranslation();
  const label = t("testVersionBanner");

  return (
    <Box
      role="status"
      aria-label={label}
      sx={{
        position: "sticky",
        top: 0,
        height: TEST_RIBBON_HEIGHT,
        flexShrink: 0,
        zIndex: (theme) => theme.zIndex.drawer + 3,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 0.5,
        color: "#713f12",
        backgroundColor: "#fef3c7",
        borderBottom: "1px solid #fcd34d",
        userSelect: "none"
      }}
    >
      <ScienceOutlinedIcon sx={{ fontSize: 10 }} />
      <Box
        component="span"
        sx={{ fontSize: 9, lineHeight: 1, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}
      >
        {label}
      </Box>
    </Box>
  );
}
