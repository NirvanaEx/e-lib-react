import React from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Slider,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DesktopWindowsOutlinedIcon from "@mui/icons-material/DesktopWindowsOutlined";
import LaptopMacOutlinedIcon from "@mui/icons-material/LaptopMacOutlined";
import TabletMacOutlinedIcon from "@mui/icons-material/TabletMacOutlined";
import PhoneIphoneOutlinedIcon from "@mui/icons-material/PhoneIphoneOutlined";
import OpenWithOutlinedIcon from "@mui/icons-material/OpenWithOutlined";
import RestartAltOutlinedIcon from "@mui/icons-material/RestartAltOutlined";
import SwapHorizOutlinedIcon from "@mui/icons-material/SwapHorizOutlined";
import SwapVertOutlinedIcon from "@mui/icons-material/SwapVertOutlined";
import ZoomInOutlinedIcon from "@mui/icons-material/ZoomInOutlined";
import { useTranslation } from "react-i18next";
import type { BrandingFocus, BrandingHAlign, BrandingVAlign } from "../settings/app-settings.api";
import {
  DEFAULT_HERO_FOCUS,
  HERO_MAX_ZOOM,
  HERO_MIN_ZOOM,
  HeroFormat,
  HeroFormatKey,
  heroFormatRatio,
  heroVisibleRegion,
  normalizeHeroFocus
} from "../../shared/ui/heroSlides";
import { HeroPreview, useHeroFormats } from "../../shared/ui/HeroStage";

const CANVAS_MAX_HEIGHT = 340;
// Travel below this (as a fraction of the image) means the frame already spans
// that axis, so dragging or sliding it there cannot move anything.
const NO_TRAVEL = 0.002;

const FORMAT_ICONS: Record<HeroFormatKey, React.ElementType> = {
  desktop: DesktopWindowsOutlinedIcon,
  laptop: LaptopMacOutlinedIcon,
  tablet: TabletMacOutlinedIcon,
  phone: PhoneIphoneOutlinedIcon
};

// Each format keeps its own corner, so the labels of overlapping frames never
// land on top of each other.
const FORMAT_LABEL_CORNERS: Record<HeroFormatKey, FrameCorner> = {
  desktop: "topLeft",
  laptop: "bottomRight",
  tablet: "topRight",
  phone: "bottomLeft"
};

type SlideText = {
  hAlign: BrandingHAlign;
  vAlign: BrandingVAlign;
  title: string;
  subtitle: string;
};

const clampPercent = (value: number) => Math.min(100, Math.max(0, Math.round(value)));

// The frames are drawn over the photo in image coordinates, so the editor needs
// the real proportions of the file, not of the box it is shown in.
function useImageRatio(imageUrl: string) {
  const [ratio, setRatio] = React.useState<number | null>(null);

  React.useEffect(() => {
    setRatio(null);
    const probe = new Image();
    probe.onload = () => {
      if (probe.naturalWidth && probe.naturalHeight) setRatio(probe.naturalWidth / probe.naturalHeight);
    };
    probe.src = imageUrl;
    return () => {
      probe.onload = null;
    };
  }, [imageUrl]);

  return ratio;
}

type FrameCorner = "topLeft" | "topRight" | "bottomLeft" | "bottomRight";

function FrameLabel({ text, corner, active }: { text: string; corner: FrameCorner; active?: boolean }) {
  const position = {
    topLeft: { top: 4, left: 4 },
    topRight: { top: 4, right: 4 },
    bottomLeft: { bottom: 4, left: 4 },
    bottomRight: { bottom: 4, right: 4 }
  }[corner];
  return (
    <Typography
      sx={{
        position: "absolute",
        ...position,
        px: 0.6,
        py: 0.1,
        borderRadius: "4px",
        fontSize: 10,
        fontWeight: 700,
        lineHeight: 1.6,
        whiteSpace: "nowrap",
        color: "#fff",
        backgroundColor: active ? "rgba(37, 99, 235, 0.92)" : "rgba(6, 18, 38, 0.72)",
        pointerEvents: "none"
      }}
    >
      {text}
    </Typography>
  );
}

// One device row in the right-hand column: the header exactly as that screen
// will crop it, with the phone wrapped in a bezel so the format is obvious.
function DevicePreviewCard({
  format,
  active,
  onSelect,
  imageUrl,
  focus,
  text
}: {
  format: HeroFormat;
  active: boolean;
  onSelect: () => void;
  imageUrl: string;
  focus: BrandingFocus;
  text: SlideText;
}) {
  const { t } = useTranslation();
  const ratio = heroFormatRatio(format);
  const isPhone = format.key === "phone";
  const preview = (
    <HeroPreview
      imageUrl={imageUrl}
      focus={focus}
      hAlign={text.hAlign}
      vAlign={text.vAlign}
      title={text.title}
      subtitle={text.subtitle}
      ratio={ratio}
      scale={isPhone ? 0.5 : 0.62}
      radius={isPhone ? 5 : 8}
      statCards={format.cardsOverlay}
    />
  );

  return (
    <Box
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      sx={{
        p: 1,
        borderRadius: "12px",
        cursor: "pointer",
        border: "1px solid",
        borderColor: active ? "primary.main" : "var(--border)",
        backgroundColor: active ? "rgba(37, 99, 235, 0.06)" : "transparent",
        transition: "border-color 0.15s ease, background-color 0.15s ease"
      }}
    >
      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.75 }}>
        {React.createElement(FORMAT_ICONS[format.key], {
          fontSize: "small",
          color: active ? "primary" : "action"
        })}
        <Typography variant="caption" sx={{ fontWeight: 700 }}>
          {t(format.labelKey)}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11, whiteSpace: "nowrap" }}>
          ≈ {format.width}×{format.height}
        </Typography>
      </Stack>
      {isPhone ? (
        <Box
          sx={{
            width: 148,
            mx: "auto",
            px: 0.75,
            pt: 0.75,
            pb: 1,
            borderRadius: "16px",
            border: "2px solid var(--border)",
            backgroundColor: "var(--surface-2)"
          }}
        >
          <Box sx={{ width: 30, height: 3, borderRadius: 2, backgroundColor: "var(--border)", mx: "auto", mb: 0.5 }} />
          {preview}
          <Box sx={{ width: 42, height: 3, borderRadius: 2, backgroundColor: "var(--border)", mx: "auto", mt: 0.75 }} />
        </Box>
      ) : (
        // Capped so all four formats fit the column without scrolling.
        <Box sx={{ maxWidth: 330, mx: "auto" }}>{preview}</Box>
      )}
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", mt: 0.5, fontSize: 11, lineHeight: 1.35 }}
      >
        {t(format.hintKey)}
      </Typography>
    </Box>
  );
}

export function HeroFramingDialog({
  open,
  onClose,
  onApply,
  slideIndex,
  imageUrl,
  focus,
  text
}: {
  open: boolean;
  onClose: () => void;
  onApply: (focus: BrandingFocus) => void;
  slideIndex: number;
  imageUrl: string;
  focus: BrandingFocus;
  text: SlideText;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("md"));
  const canvasRef = React.useRef<HTMLDivElement | null>(null);
  const dragRef = React.useRef<{ pointerX: number; pointerY: number; x: number; y: number } | null>(null);

  const [draft, setDraft] = React.useState<BrandingFocus>(() => normalizeHeroFocus(focus));
  const [activeKey, setActiveKey] = React.useState<HeroFormatKey>("desktop");
  const [dragging, setDragging] = React.useState(false);
  const naturalRatio = useImageRatio(imageUrl);

  // Every opening starts from the framing currently stored on the slide, so
  // closing with Cancel leaves the slide untouched.
  React.useEffect(() => {
    if (open) {
      setDraft(normalizeHeroFocus(focus));
      setActiveKey("desktop");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const formats = useHeroFormats();
  const activeFormat = formats.find((format) => format.key === activeKey) ?? formats[0];
  const activeRatio = heroFormatRatio(activeFormat);
  // Until the photo reports its own size, assume it fills the header exactly.
  const imageRatio = naturalRatio ?? activeRatio;
  const activeRegion = heroVisibleRegion(imageRatio, activeRatio, draft);
  const freeX = 1 - activeRegion.width;
  const freeY = 1 - activeRegion.height;

  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerX: event.clientX, pointerY: event.clientY, x: draft.x, y: draft.y };
    setDragging(true);
  };

  const moveDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const canvas = canvasRef.current?.getBoundingClientRect();
    if (!drag || !canvas) return;
    // Pointer travel is measured against the free play of the frame, so the
    // photo follows the cursor one-to-one.
    const nextX = freeX > NO_TRAVEL ? drag.x + ((event.clientX - drag.pointerX) / canvas.width / freeX) * 100 : drag.x;
    const nextY = freeY > NO_TRAVEL ? drag.y + ((event.clientY - drag.pointerY) / canvas.height / freeY) * 100 : drag.y;
    setDraft((prev) => ({ ...prev, x: clampPercent(nextX), y: clampPercent(nextY) }));
  };

  const endDrag = () => {
    dragRef.current = null;
    setDragging(false);
  };

  const nudge = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 10 : 2;
    const deltas: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step]
    };
    const delta = deltas[event.key];
    if (!delta) return;
    event.preventDefault();
    setDraft((prev) => ({ ...prev, x: clampPercent(prev.x + delta[0]), y: clampPercent(prev.y + delta[1]) }));
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg" fullScreen={fullScreen}>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5, pr: 1.5 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography component="span" sx={{ fontWeight: 700, fontSize: "1.05rem", display: "block" }}>
            {t("heroFramingTitle")}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t("slide")} {slideIndex + 1}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ pt: 2.5 }}>
        <Box
          sx={{
            display: "grid",
            gap: 2.5,
            gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1.45fr) minmax(320px, 1fr)" },
            alignItems: "start"
          }}
        >
          <Stack spacing={1.75}>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.75 }}>
                {t("framingFormatLabel")}
              </Typography>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={activeKey}
                onChange={(_event, next) => next && setActiveKey(next as HeroFormatKey)}
              >
                {formats.map((format) => (
                  <ToggleButton key={format.key} value={format.key} sx={{ textTransform: "none", fontWeight: 600 }}>
                    {React.createElement(FORMAT_ICONS[format.key], { fontSize: "small", sx: { mr: 0.75 } })}
                    {t(format.labelKey)}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>

            <Box
              ref={canvasRef}
              sx={{
                position: "relative",
                width: "100%",
                maxWidth: Math.round(CANVAS_MAX_HEIGHT * imageRatio),
                mx: "auto",
                aspectRatio: String(imageRatio),
                borderRadius: "10px",
                overflow: "hidden",
                backgroundColor: "#0a1a33",
                touchAction: "none"
              }}
            >
              <Box
                component="img"
                src={imageUrl}
                alt=""
                draggable={false}
                sx={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  userSelect: "none"
                }}
              />

              {/* Frames of the formats that are not being edited — dashed, just
                  to show where those screens cut the photo. */}
              {formats.filter((format) => format.key !== activeKey).map((format) => {
                const region = heroVisibleRegion(imageRatio, heroFormatRatio(format), draft);
                return (
                  <Box
                    key={format.key}
                    sx={{
                      position: "absolute",
                      left: `${region.left * 100}%`,
                      top: `${region.top * 100}%`,
                      width: `${region.width * 100}%`,
                      height: `${region.height * 100}%`,
                      border: "1.5px dashed rgba(255,255,255,0.72)",
                      borderRadius: "4px",
                      pointerEvents: "none"
                    }}
                  >
                    <FrameLabel text={t(format.labelKey)} corner={FORMAT_LABEL_CORNERS[format.key]} />
                  </Box>
                );
              })}

              {/* The frame being edited: everything outside it is dimmed, so the
                  bright rectangle is literally what visitors will see. */}
              <Box
                onPointerDown={startDrag}
                onPointerMove={moveDrag}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onKeyDown={nudge}
                tabIndex={0}
                aria-label={t("framingActive")}
                sx={{
                  position: "absolute",
                  left: `${activeRegion.left * 100}%`,
                  top: `${activeRegion.top * 100}%`,
                  width: `${activeRegion.width * 100}%`,
                  height: `${activeRegion.height * 100}%`,
                  border: "2px solid #fff",
                  borderRadius: "4px",
                  boxShadow: "0 0 0 9999px rgba(5, 16, 34, 0.62)",
                  cursor: dragging ? "grabbing" : "grab",
                  outline: "none",
                  "&:focus-visible": { borderColor: "primary.light" }
                }}
              >
                <FrameLabel
                  active
                  text={`${t(activeFormat.labelKey)} · ${t("framingActive")}`}
                  corner={FORMAT_LABEL_CORNERS[activeFormat.key]}
                />
                {/* Rule-of-thirds guides. */}
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    opacity: 0.32,
                    pointerEvents: "none",
                    "&::before": {
                      content: '""',
                      position: "absolute",
                      top: 0,
                      bottom: 0,
                      left: "33.333%",
                      right: "33.333%",
                      borderLeft: "1px solid #fff",
                      borderRight: "1px solid #fff"
                    },
                    "&::after": {
                      content: '""',
                      position: "absolute",
                      left: 0,
                      right: 0,
                      top: "33.333%",
                      bottom: "33.333%",
                      borderTop: "1px solid #fff",
                      borderBottom: "1px solid #fff"
                    }
                  }}
                />
                <OpenWithOutlinedIcon
                  sx={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    transform: "translate(-50%, -50%)",
                    color: "rgba(255,255,255,0.85)",
                    fontSize: 22,
                    pointerEvents: "none",
                    filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.6))"
                  }}
                />
              </Box>
            </Box>

            <Typography variant="caption" color="text.secondary">
              {t("heroFramingHint")}
            </Typography>

            <Stack spacing={1.25}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <ZoomInOutlinedIcon fontSize="small" color="action" />
                <Typography variant="caption" sx={{ width: 112, fontWeight: 600 }}>
                  {t("framingZoom")}
                </Typography>
                <Slider
                  size="small"
                  min={HERO_MIN_ZOOM}
                  max={HERO_MAX_ZOOM}
                  step={5}
                  value={draft.zoom}
                  onChange={(_event, value) => setDraft((prev) => ({ ...prev, zoom: value as number }))}
                  sx={{ flex: 1, minWidth: 90 }}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(value) => `${value}%`}
                />
                <Typography variant="caption" color="text.secondary" sx={{ width: 44, textAlign: "right" }}>
                  {draft.zoom}%
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <SwapHorizOutlinedIcon fontSize="small" color="action" />
                <Typography variant="caption" sx={{ width: 112, fontWeight: 600 }}>
                  {t("framingPosX")}
                </Typography>
                <Slider
                  size="small"
                  min={0}
                  max={100}
                  value={draft.x}
                  onChange={(_event, value) => setDraft((prev) => ({ ...prev, x: value as number }))}
                  sx={{ flex: 1, minWidth: 90 }}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(value) => `${value}%`}
                />
                <Typography variant="caption" color="text.secondary" sx={{ width: 44, textAlign: "right" }}>
                  {draft.x}%
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <SwapVertOutlinedIcon fontSize="small" color="action" />
                <Typography variant="caption" sx={{ width: 112, fontWeight: 600 }}>
                  {t("framingPosY")}
                </Typography>
                <Slider
                  size="small"
                  min={0}
                  max={100}
                  value={draft.y}
                  onChange={(_event, value) => setDraft((prev) => ({ ...prev, y: value as number }))}
                  sx={{ flex: 1, minWidth: 90 }}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(value) => `${value}%`}
                />
                <Typography variant="caption" color="text.secondary" sx={{ width: 44, textAlign: "right" }}>
                  {draft.y}%
                </Typography>
              </Stack>
            </Stack>
          </Stack>

          <Stack spacing={1}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {t("framingPreviews")}
              </Typography>
              <Chip size="small" variant="outlined" label={`${draft.x}% · ${draft.y}% · ${draft.zoom}%`} />
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11, lineHeight: 1.35 }}>
              {t("formatCardsNote")}
            </Typography>
            {/* Wide layouts stacked, the two narrow ones side by side — all four
                formats stay visible without scrolling. */}
            {formats
              .filter((format) => format.cardsOverlay)
              .map((format) => (
                <DevicePreviewCard
                  key={format.key}
                  format={format}
                  active={format.key === activeKey}
                  onSelect={() => setActiveKey(format.key)}
                  imageUrl={imageUrl}
                  focus={draft}
                  text={text}
                />
              ))}
            <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" }}>
              {formats
                .filter((format) => !format.cardsOverlay)
                .map((format) => (
                  <DevicePreviewCard
                    key={format.key}
                    format={format}
                    active={format.key === activeKey}
                    onSelect={() => setActiveKey(format.key)}
                    imageUrl={imageUrl}
                    focus={draft}
                    text={text}
                  />
                ))}
            </Box>
          </Stack>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.75 }}>
        <Button color="inherit" startIcon={<RestartAltOutlinedIcon />} onClick={() => setDraft(DEFAULT_HERO_FOCUS)}>
          {t("framingReset")}
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button color="inherit" onClick={onClose}>
          {t("cancel")}
        </Button>
        <Button variant="contained" sx={{ boxShadow: "none" }} onClick={() => onApply(draft)}>
          {t("framingApply")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
