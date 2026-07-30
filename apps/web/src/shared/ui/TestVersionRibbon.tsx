import React from "react";
import { Box } from "@mui/material";
import ScienceOutlinedIcon from "@mui/icons-material/ScienceOutlined";
import { useTranslation } from "react-i18next";

export const TEST_RIBBON_HEIGHT = 18;

/**
 * Compact moving status line that occupies its own space above the
 * application header, so it never covers navigation or page content.
 */
export function TestVersionRibbon() {
  const { t } = useTranslation();
  const label = t("testVersionBanner");

  const segment = (
    <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, px: 2, whiteSpace: "nowrap" }}>
      <ScienceOutlinedIcon sx={{ fontSize: 10 }} />
      <Box component="span" sx={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
        {label}
      </Box>
      <Box component="span" sx={{ opacity: 0.55 }}>
        •
      </Box>
    </Box>
  );

  const group = (
    <Box component="span" aria-hidden sx={{ display: "inline-flex", flexShrink: 0 }}>
      {Array.from({ length: 8 }).map((_, index) => (
        <React.Fragment key={index}>{segment}</React.Fragment>
      ))}
    </Box>
  );

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
        overflow: "hidden",
        color: "#1f2937",
        background: "linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%)",
        borderBottom: "1px solid rgba(0,0,0,0.18)",
        userSelect: "none"
      }}
    >
      <Box
        sx={{
          display: "inline-flex",
          flexWrap: "nowrap",
          width: "max-content",
          animation: "elib-test-marquee 26s linear infinite",
          "@keyframes elib-test-marquee": {
            from: { transform: "translateX(0)" },
            to: { transform: "translateX(-50%)" }
          },
          "@media (prefers-reduced-motion: reduce)": {
            animation: "none"
          }
        }}
      >
        {group}
        {group}
      </Box>
    </Box>
  );
}
