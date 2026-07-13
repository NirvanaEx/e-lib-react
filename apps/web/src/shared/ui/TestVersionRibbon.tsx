import React from "react";
import { Box } from "@mui/material";
import ScienceOutlinedIcon from "@mui/icons-material/ScienceOutlined";
import { useTranslation } from "react-i18next";

export const TEST_RIBBON_HEIGHT = 30;

/**
 * Thin animated "test version" band pinned to the bottom of the viewport.
 * The text is duplicated into two identical groups and the track is shifted
 * by exactly one group width (-50%) so the marquee loops seamlessly.
 */
export function TestVersionRibbon() {
  const { t } = useTranslation();
  const label = t("testVersionBanner");

  const segment = (
    <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 1, px: 3, whiteSpace: "nowrap" }}>
      <ScienceOutlinedIcon sx={{ fontSize: 15 }} />
      <Box component="span" sx={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase" }}>
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
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        height: TEST_RIBBON_HEIGHT,
        zIndex: (theme) => theme.zIndex.drawer + 2,
        display: "flex",
        alignItems: "center",
        overflow: "hidden",
        color: "#1f2937",
        background: "linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%)",
        borderTop: "1px solid rgba(0,0,0,0.18)",
        boxShadow: "0 -2px 10px rgba(0,0,0,0.14)",
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
