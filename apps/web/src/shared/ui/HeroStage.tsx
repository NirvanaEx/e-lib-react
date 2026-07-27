import React from "react";
import { Box, Typography } from "@mui/material";
import type { BrandingFocus, BrandingHAlign, BrandingVAlign } from "../../features/settings/app-settings.api";
import {
  heroAlignItems,
  heroFocusSx,
  heroFormats,
  heroJustifyContent,
  heroOverlayGradient,
  normalizeHeroFocus
} from "./heroSlides";

// The widest header format follows the window, so the editor previews match the
// screen the admin is looking at instead of a guessed width.
export function useHeroFormats() {
  const [width, setWidth] = React.useState(() =>
    typeof document === "undefined" ? 1440 : document.documentElement.clientWidth
  );

  React.useEffect(() => {
    const onResize = () => setWidth(document.documentElement.clientWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return React.useMemo(() => heroFormats(width), [width]);
}

// The photo layer of the header. Rendered as an <img> (not a background) so the
// admin's framing — focal point + zoom — can be applied with object-position and
// a transform; the parent must clip overflow.
export function HeroImage({
  src,
  focus,
  alt = ""
}: {
  src: string;
  focus?: Partial<BrandingFocus> | null;
  alt?: string;
}) {
  const value = normalizeHeroFocus(focus);
  return (
    <Box
      component="img"
      src={src}
      alt={alt}
      draggable={false}
      sx={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        display: "block",
        userSelect: "none",
        ...heroFocusSx(value)
      }}
    />
  );
}

// Photo + scrim + a flex slot for the text block: the shared skeleton of the
// live carousel slide, the admin previews and the framing dialog previews.
export function HeroStage({
  imageUrl,
  focus,
  hAlign,
  vAlign,
  hasText,
  children,
  sx
}: {
  imageUrl: string;
  focus?: Partial<BrandingFocus> | null;
  hAlign: BrandingHAlign;
  vAlign: BrandingVAlign;
  hasText: boolean;
  children?: React.ReactNode;
  sx?: object;
}) {
  const overlay = heroOverlayGradient(hAlign, hasText);
  return (
    <Box sx={{ position: "absolute", inset: 0, overflow: "hidden", ...sx }}>
      <HeroImage src={imageUrl} focus={focus} />
      {overlay && <Box sx={{ position: "absolute", inset: 0, backgroundImage: overlay }} />}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          display: "flex",
          justifyContent: heroJustifyContent[hAlign],
          alignItems: heroAlignItems[vAlign]
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

// Scaled-down copy of the header used everywhere in the admin: the box keeps the
// aspect ratio of the target screen, so what is cut off here is cut off for real.
export function HeroPreview({
  imageUrl,
  focus,
  hAlign,
  vAlign,
  title,
  subtitle,
  ratio,
  scale = 1,
  radius = 10,
  statCards = false,
  children
}: {
  imageUrl: string;
  focus?: Partial<BrandingFocus> | null;
  hAlign: BrandingHAlign;
  vAlign: BrandingVAlign;
  title: string;
  subtitle: string;
  ratio: number;
  // Typography multiplier — small device previews need proportionally small text.
  scale?: number;
  radius?: number;
  // Ghosts of the home page stat cards that cover the bottom of the header on md+.
  statCards?: boolean;
  children?: React.ReactNode;
}) {
  const hasText = Boolean(title || subtitle);
  const clamp = (lines: number) => ({
    display: "-webkit-box",
    WebkitLineClamp: lines,
    WebkitBoxOrient: "vertical" as const,
    overflow: "hidden"
  });

  return (
    <Box
      sx={{
        position: "relative",
        borderRadius: `${radius}px`,
        overflow: "hidden",
        aspectRatio: String(ratio),
        backgroundColor: "var(--surface-2)"
      }}
    >
      <HeroStage imageUrl={imageUrl} focus={focus} hAlign={hAlign} vAlign={vAlign} hasText={hasText}>
        {hasText && (
          <Box sx={{ px: 2.5 * scale, py: 2 * scale, maxWidth: "74%", textAlign: hAlign }}>
            {title && (
              <Typography
                sx={{
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: Math.max(8, Math.round(17 * scale)),
                  lineHeight: 1.2,
                  letterSpacing: "-0.02em",
                  ...clamp(2)
                }}
              >
                {title}
              </Typography>
            )}
            {subtitle && (
              <Typography
                sx={{
                  color: "rgba(255,255,255,0.82)",
                  fontSize: Math.max(7, Math.round(12 * scale)),
                  lineHeight: 1.35,
                  mt: 0.5 * scale,
                  ...clamp(3)
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
        )}
      </HeroStage>
      {statCards && (
        <Box
          sx={{
            position: "absolute",
            left: "2.9%",
            right: "2.9%",
            bottom: "8%",
            height: "20%",
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "1.4%",
            pointerEvents: "none"
          }}
        >
          {[0, 1, 2, 3].map((card) => (
            <Box
              key={card}
              sx={{
                borderRadius: "4px",
                backgroundColor: "rgba(255,255,255,0.16)",
                border: "1px solid rgba(255,255,255,0.32)"
              }}
            />
          ))}
        </Box>
      )}
      {children}
    </Box>
  );
}
