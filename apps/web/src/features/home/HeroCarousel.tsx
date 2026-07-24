import React from "react";
import { Box, ButtonBase, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useBranding } from "../../shared/hooks/useBranding";
import { getBrandingImageUrl } from "../settings/app-settings.api";
import type { BrandingHAlign, BrandingVAlign } from "../settings/app-settings.api";
import {
  heroAlignItems,
  heroJustifyContent,
  heroOverlayGradient,
  resolveBrandingText
} from "../../shared/ui/heroSlides";
import heroImage from "../../assets/main-back3.png";

const MIN_INTERVAL = 2;
const MAX_INTERVAL = 120;

function HeroText({
  hAlign,
  vAlign,
  title,
  subtitle
}: {
  hAlign: BrandingHAlign;
  vAlign: BrandingVAlign;
  title: string;
  subtitle: string;
}) {
  if (!title && !subtitle) return null;
  return (
    <Box
      sx={{
        px: { xs: 3, md: 5 },
        py: { xs: 3.5, md: 5 },
        // On md the stat cards overlay the bottom of the hero, so
        // bottom-aligned text needs extra clearance.
        pb: vAlign === "bottom" ? { xs: 3.5, md: 18 } : { xs: 3.5, md: 10 },
        maxWidth: 600,
        textAlign: hAlign
      }}
    >
      {title && (
        <Typography
          variant="h3"
          sx={{ color: "#fff", fontWeight: 800, letterSpacing: "-0.02em", fontSize: { xs: 24, md: 32 } }}
        >
          {title}
        </Typography>
      )}
      {subtitle && (
        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.82)", mt: 1.25, maxWidth: 500 }}>
          {subtitle}
        </Typography>
      )}
    </Box>
  );
}

function SlideLayer({
  active,
  imageUrl,
  overlay,
  hAlign,
  vAlign,
  title,
  subtitle
}: {
  active: boolean;
  imageUrl: string;
  overlay: string | null;
  hAlign: BrandingHAlign;
  vAlign: BrandingVAlign;
  title: string;
  subtitle: string;
}) {
  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        opacity: active ? 1 : 0,
        transition: "opacity 0.7s ease",
        pointerEvents: active ? "auto" : "none",
        display: "flex",
        justifyContent: heroJustifyContent[hAlign],
        alignItems: heroAlignItems[vAlign],
        backgroundImage: [overlay, `url(${imageUrl})`].filter(Boolean).join(", "),
        backgroundSize: "cover",
        backgroundPosition: "right top"
      }}
    >
      <HeroText hAlign={hAlign} vAlign={vAlign} title={title} subtitle={subtitle} />
    </Box>
  );
}

export function HeroCarousel() {
  const { t, i18n } = useTranslation();
  const branding = useBranding();

  const slides = branding?.heroSlides?.length ? branding.heroSlides : null;
  const count = slides?.length ?? 1;
  const intervalMs = Math.min(MAX_INTERVAL, Math.max(MIN_INTERVAL, branding?.heroIntervalSec || 7)) * 1000;
  const sharedMode = branding?.heroTextMode === "shared";
  const sharedText = branding?.heroSharedText ?? { title: {}, subtitle: {}, hAlign: "left" as const, vAlign: "center" as const };
  const sharedTitle = resolveBrandingText(sharedText.title, i18n.language);
  const sharedSubtitle = resolveBrandingText(sharedText.subtitle, i18n.language);
  const sharedHasText = Boolean(sharedTitle || sharedSubtitle);

  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  React.useEffect(() => {
    if (index >= count) setIndex(0);
  }, [count, index]);

  React.useEffect(() => {
    if (count < 2 || paused) return;
    const timer = window.setInterval(() => setIndex((prev) => (prev + 1) % count), intervalMs);
    return () => window.clearInterval(timer);
  }, [count, intervalMs, paused]);

  return (
    <Box
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      sx={{ borderRadius: "12px", overflow: "hidden", position: "relative", minHeight: { xs: 260, md: 440 } }}
    >
      {slides ? (
        sharedMode ? (
          <>
            {slides.map((slide, i) => (
              <SlideLayer
                key={slide.id}
                active={i === index}
                imageUrl={getBrandingImageUrl(slide.image) || heroImage}
                overlay={heroOverlayGradient(sharedText.hAlign, sharedHasText)}
                hAlign={sharedText.hAlign}
                vAlign={sharedText.vAlign}
                title=""
                subtitle=""
              />
            ))}
            {/* One fixed text block on top — only the images rotate underneath. */}
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                display: "flex",
                justifyContent: heroJustifyContent[sharedText.hAlign],
                alignItems: heroAlignItems[sharedText.vAlign],
                pointerEvents: "none"
              }}
            >
              <HeroText
                hAlign={sharedText.hAlign}
                vAlign={sharedText.vAlign}
                title={sharedTitle}
                subtitle={sharedSubtitle}
              />
            </Box>
          </>
        ) : (
          slides.map((slide, i) => {
            const title = resolveBrandingText(slide.title, i18n.language);
            const subtitle = resolveBrandingText(slide.subtitle, i18n.language);
            return (
              <SlideLayer
                key={slide.id}
                active={i === index}
                imageUrl={getBrandingImageUrl(slide.image) || heroImage}
                overlay={heroOverlayGradient(slide.hAlign, Boolean(title || subtitle))}
                hAlign={slide.hAlign}
                vAlign={slide.vAlign}
                title={title}
                subtitle={subtitle}
              />
            );
          })
        )
      ) : (
        <SlideLayer
          active
          imageUrl={heroImage}
          overlay={heroOverlayGradient("left", true)}
          hAlign="left"
          vAlign="center"
          title={t("homeHeroTitle")}
          subtitle={t("homeHeroSubtitle")}
        />
      )}

      {count > 1 && slides && (
        <Box
          sx={{
            position: "absolute",
            right: 14,
            top: "50%",
            transform: "translateY(-50%)",
            display: "flex",
            flexDirection: "column",
            gap: 1
          }}
        >
          {slides.map((slide, i) => (
            <ButtonBase
              key={slide.id}
              onClick={() => setIndex(i)}
              aria-label={`${t("slide")} ${i + 1}`}
              sx={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                backgroundColor: i === index ? "#fff" : "rgba(255,255,255,0.45)",
                boxShadow: "0 0 4px rgba(0,0,0,0.35)",
                transition: "background-color 0.2s ease"
              }}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
