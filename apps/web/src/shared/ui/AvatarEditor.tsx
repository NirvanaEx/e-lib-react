import React from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Slider,
  Stack,
  Typography
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import { useTranslation } from "react-i18next";

const VIEW = 340;
const CIRCLE = 300;
const OUTPUT = 512;
const MAX_ZOOM_FACTOR = 4;

export function ImageLightbox({ open, src, onClose }: { open: boolean; src?: string | null; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onClose={onClose} fullScreen PaperProps={{ sx: { backgroundColor: "rgba(4, 9, 19, 0.94)" } }}>
      <IconButton
        onClick={onClose}
        aria-label={t("close")}
        sx={{
          position: "fixed",
          top: 16,
          right: 16,
          zIndex: 1,
          color: "#fff",
          backgroundColor: "rgba(255, 255, 255, 0.14)",
          "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.26)" }
        }}
      >
        <CloseIcon />
      </IconButton>
      <Box
        onClick={onClose}
        sx={{ width: "100%", height: "100%", display: "grid", placeItems: "center", cursor: "zoom-out", p: 2 }}
      >
        {src && (
          <Box
            component="img"
            src={src}
            alt=""
            onClick={(event: React.MouseEvent) => event.stopPropagation()}
            sx={{ maxWidth: "94vw", maxHeight: "92vh", objectFit: "contain", borderRadius: "10px", cursor: "default" }}
          />
        )}
      </Box>
    </Dialog>
  );
}

type CropState = {
  scale: number;
  minScale: number;
  offset: { x: number; y: number };
};

// Move/zoom the photo under a fixed centered circle, then export the circle
// area as a square PNG. The confirm button is the "publish" step.
export function AvatarCropDialog({
  open,
  file,
  saving,
  onClose,
  onSave
}: {
  open: boolean;
  file: File | null;
  saving?: boolean;
  onClose: () => void;
  onSave: (blob: Blob) => void;
}) {
  const { t } = useTranslation();
  const [url, setUrl] = React.useState<string | null>(null);
  const imgRef = React.useRef<HTMLImageElement | null>(null);
  const viewportRef = React.useRef<HTMLDivElement | null>(null);
  const [natural, setNatural] = React.useState<{ w: number; h: number } | null>(null);
  const [crop, setCrop] = React.useState<CropState | null>(null);
  const dragRef = React.useRef<{ pointerId: number; startX: number; startY: number; baseX: number; baseY: number } | null>(null);

  React.useEffect(() => {
    if (!file) {
      setUrl(null);
      setNatural(null);
      setCrop(null);
      return;
    }
    const nextUrl = URL.createObjectURL(file);
    setUrl(nextUrl);
    setNatural(null);
    setCrop(null);
    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);

  const clampOffset = React.useCallback((offset: { x: number; y: number }, scale: number, nat: { w: number; h: number }) => {
    const margin = (VIEW - CIRCLE) / 2;
    const minX = margin + CIRCLE - nat.w * scale;
    const minY = margin + CIRCLE - nat.h * scale;
    return {
      x: Math.min(margin, Math.max(minX, offset.x)),
      y: Math.min(margin, Math.max(minY, offset.y))
    };
  }, []);

  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth: w, naturalHeight: h } = event.currentTarget;
    if (!w || !h) return;
    const minScale = Math.max(CIRCLE / w, CIRCLE / h);
    const offset = { x: (VIEW - w * minScale) / 2, y: (VIEW - h * minScale) / 2 };
    setNatural({ w, h });
    setCrop({ scale: minScale, minScale, offset });
  };

  const applyScale = React.useCallback(
    (nextScale: number) => {
      setCrop((prev) => {
        if (!prev || !natural) return prev;
        const scale = Math.min(prev.minScale * MAX_ZOOM_FACTOR, Math.max(prev.minScale, nextScale));
        const center = VIEW / 2;
        const ratio = scale / prev.scale;
        const offset = clampOffset(
          { x: center - (center - prev.offset.x) * ratio, y: center - (center - prev.offset.y) * ratio },
          scale,
          natural
        );
        return { ...prev, scale, offset };
      });
    },
    [natural, clampOffset]
  );

  // Wheel zoom needs a non-passive listener to keep the page from scrolling.
  React.useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !crop) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      applyScale(crop.scale * (event.deltaY > 0 ? 0.92 : 1.08));
    };
    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, [crop, applyScale]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!crop) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      baseX: crop.offset.x,
      baseY: crop.offset.y
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !natural) return;
    setCrop((prev) => {
      if (!prev) return prev;
      const offset = clampOffset(
        { x: drag.baseX + event.clientX - drag.startX, y: drag.baseY + event.clientY - drag.startY },
        prev.scale,
        natural
      );
      return { ...prev, offset };
    });
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
    }
  };

  const handleSave = () => {
    const img = imgRef.current;
    if (!img || !natural || !crop) return;
    const margin = (VIEW - CIRCLE) / 2;
    const sx = (margin - crop.offset.x) / crop.scale;
    const sy = (margin - crop.offset.y) / crop.scale;
    const side = CIRCLE / crop.scale;
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT;
    canvas.height = OUTPUT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, sx, sy, side, side, 0, 0, OUTPUT, OUTPUT);
    canvas.toBlob((blob) => {
      if (blob) onSave(blob);
    }, "image/png");
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="xs">
      <DialogTitle sx={{ pb: 1 }}>{t("adjustPhoto")}</DialogTitle>
      <DialogContent sx={{ pb: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
          {t("adjustPhotoHint")}
        </Typography>
        <Box
          ref={viewportRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          sx={{
            position: "relative",
            width: "100%",
            maxWidth: VIEW,
            height: VIEW,
            mx: "auto",
            overflow: "hidden",
            borderRadius: "12px",
            backgroundColor: "#0b1424",
            touchAction: "none",
            userSelect: "none",
            cursor: "grab",
            "&:active": { cursor: "grabbing" }
          }}
        >
          {url && (
            <Box
              component="img"
              ref={imgRef}
              src={url}
              alt=""
              draggable={false}
              onLoad={handleImageLoad}
              sx={{
                position: "absolute",
                left: 0,
                top: 0,
                maxWidth: "none",
                transformOrigin: "0 0",
                transform: crop
                  ? `translate(${crop.offset.x}px, ${crop.offset.y}px) scale(${crop.scale})`
                  : "translate(-9999px, -9999px)",
                willChange: "transform",
                pointerEvents: "none"
              }}
            />
          )}
          <Box
            sx={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: CIRCLE,
              height: CIRCLE,
              transform: "translate(-50%, -50%)",
              borderRadius: "50%",
              boxShadow: "0 0 0 9999px rgba(2, 8, 23, 0.62)",
              border: "2px solid rgba(255, 255, 255, 0.85)",
              pointerEvents: "none"
            }}
          />
        </Box>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 2, px: 0.5 }}>
          <ZoomOutIcon fontSize="small" sx={{ color: "text.secondary" }} />
          <Slider
            size="small"
            aria-label={t("zoom")}
            disabled={!crop}
            min={crop?.minScale ?? 0}
            max={(crop?.minScale ?? 0) * MAX_ZOOM_FACTOR}
            step={(crop?.minScale ?? 1) / 50}
            value={crop?.scale ?? 0}
            onChange={(_, value) => applyScale(Number(value))}
          />
          <ZoomInIcon fontSize="small" sx={{ color: "text.secondary" }} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          {t("cancel")}
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={!crop || saving}>
          {t("save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
