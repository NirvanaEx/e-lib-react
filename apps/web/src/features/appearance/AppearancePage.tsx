import React from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import CropOutlinedIcon from "@mui/icons-material/CropOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import FileUploadOutlinedIcon from "@mui/icons-material/FileUploadOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import ViewCarouselOutlinedIcon from "@mui/icons-material/ViewCarouselOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Page } from "../../shared/ui/Page";
import { useToast } from "../../shared/ui/ToastProvider";
import { LoadingState } from "../../shared/ui/LoadingState";
import { TranslationsEditor } from "../../shared/ui/TranslationsEditor";
import { getErrorMessage } from "../../shared/utils/errors";
import {
  BrandingHAlign,
  BrandingSlide,
  BrandingText,
  BrandingVAlign,
  HeroSharedText,
  fetchAdminAppSettings,
  getBrandingImageUrl,
  updateAppSettings,
  uploadBrandingImage
} from "../settings/app-settings.api";
import {
  DEFAULT_HERO_FOCUS,
  heroFocusForFormat,
  heroFormatRatio,
  heroOverrideCount,
  isDefaultHeroFocus,
  normalizeHeroFocus,
  normalizeHeroOverrides,
  resolveBrandingText,
  resolveHeroFormatKey
} from "../../shared/ui/heroSlides";
import { HeroPreview, useHeroFormats, useViewportWidth } from "../../shared/ui/HeroStage";
import { HeroFramingDialog } from "./HeroFramingDialog";
import i18n from "../../app/i18n";
import defaultHeroImage from "../../assets/main-back3.png";
import defaultLoginImage from "../../assets/login-back3.png";
import defaultLogoLight from "../../assets/logo-full-color.png";
import defaultLogoDark from "../../assets/logo-full-white.png";

const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp,image/gif";
const LANGS = ["ru", "en", "uz"] as const;
const MAX_SLIDES = 12;
const MIN_INTERVAL = 2;
const MAX_INTERVAL = 120;

const cardSx = { p: 2, borderRadius: "12px", border: "1px solid var(--border)" } as const;
const darkPreviewBackground = "linear-gradient(180deg, #123a6b 0%, #0c2a52 100%)";

function newSlide(): BrandingSlide {
  const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  return {
    id,
    image: null,
    focus: DEFAULT_HERO_FOCUS,
    focusByFormat: {},
    title: {},
    subtitle: {},
    hAlign: "left",
    vAlign: "center"
  };
}

// When nothing is customized yet, the editor opens with the header the home
// page currently shows (default texts in all languages + standard image), so
// the existing content can be edited in place instead of starting from scratch.
function currentDefaultSlide(): BrandingSlide {
  const slide = newSlide();
  // Framing of the untouched home page header: the stock photo sits top-right.
  slide.focus = { x: 100, y: 0, zoom: 100 };
  LANGS.forEach((lang) => {
    const translate = i18n.getFixedT(lang);
    slide.title[lang] = translate("homeHeroTitle");
    slide.subtitle[lang] = translate("homeHeroSubtitle");
  });
  return slide;
}

const DEFAULT_SHARED_TEXT: HeroSharedText = { title: {}, subtitle: {}, hAlign: "left", vAlign: "center" };

function isTextEmpty(text: BrandingText) {
  return !LANGS.some((lang) => (text[lang] || "").trim());
}

// Shared texts prefilled with the current default header, so switching the mode
// starts from the existing content.
function defaultSharedText(): HeroSharedText {
  const title: Record<string, string> = {};
  const subtitle: Record<string, string> = {};
  LANGS.forEach((lang) => {
    const translate = i18n.getFixedT(lang);
    title[lang] = translate("homeHeroTitle");
    subtitle[lang] = translate("homeHeroSubtitle");
  });
  return { title, subtitle, hAlign: "left", vAlign: "center" };
}

type SettingsPayload = {
  testRibbonEnabled: boolean;
  branding: {
    heroSlides: BrandingSlide[];
    heroIntervalSec: number;
    heroTextMode: "perSlide" | "shared";
    heroSharedText: HeroSharedText;
    logoLight: string | null;
    logoDark: string | null;
    loginBackground: string | null;
  };
};

function buildPayload(state: {
  testRibbonEnabled: boolean;
  slides: BrandingSlide[];
  intervalSec: number;
  heroTextMode: "perSlide" | "shared";
  sharedText: HeroSharedText;
  logoLight: string | null;
  logoDark: string | null;
  loginBackground: string | null;
}): SettingsPayload {
  return {
    testRibbonEnabled: state.testRibbonEnabled,
    branding: {
      heroSlides: state.slides,
      heroIntervalSec: Math.min(MAX_INTERVAL, Math.max(MIN_INTERVAL, Math.round(Number(state.intervalSec) || 7))),
      heroTextMode: state.heroTextMode,
      heroSharedText: state.sharedText,
      logoLight: state.logoLight,
      logoDark: state.logoDark,
      loginBackground: state.loginBackground
    }
  };
}

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      {hint && (
        <Typography variant="caption" color="text.secondary">
          {hint}
        </Typography>
      )}
    </Box>
  );
}

function UploadImageButton({ label, onUploaded }: { label: string; onUploaded: (file: string) => void }) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const mutation = useMutation({
    mutationFn: uploadBrandingImage,
    onSuccess: (data) => onUploaded(data.file),
    onError: (error) => showToast({ message: getErrorMessage(error, t("actionFailed")), severity: "error" })
  });

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) mutation.mutate(file);
        }}
      />
      <Button
        size="small"
        variant="outlined"
        startIcon={mutation.isPending ? <CircularProgress size={14} /> : <FileUploadOutlinedIcon />}
        disabled={mutation.isPending}
        onClick={() => inputRef.current?.click()}
      >
        {label}
      </Button>
    </>
  );
}

function ImageSlot({
  value,
  fallbackSrc,
  onChange,
  height = 96,
  darkBg = false
}: {
  value: string | null;
  fallbackSrc?: string;
  onChange: (file: string | null) => void;
  height?: number;
  darkBg?: boolean;
}) {
  const { t } = useTranslation();
  const src = getBrandingImageUrl(value) || fallbackSrc;
  return (
    <Stack spacing={1.25}>
      <Box
        sx={{
          height,
          borderRadius: "10px",
          border: "1px dashed var(--border)",
          background: darkBg ? darkPreviewBackground : "var(--surface-2)",
          display: "grid",
          placeItems: "center",
          overflow: "hidden",
          px: 2
        }}
      >
        {src ? (
          <Box component="img" src={src} alt="" sx={{ maxWidth: "100%", maxHeight: "80%", objectFit: "contain" }} />
        ) : (
          <Typography variant="caption" color="text.secondary">
            {t("noCustomImage")}
          </Typography>
        )}
      </Box>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <UploadImageButton label={t("uploadImage")} onUploaded={(file) => onChange(file)} />
        {value && (
          <Button size="small" color="error" startIcon={<DeleteOutlineIcon />} onClick={() => onChange(null)}>
            {t("removeImage")}
          </Button>
        )}
        {!value && src && (
          <Typography variant="caption" color="text.secondary">
            {t("noCustomImage")}
          </Typography>
        )}
      </Stack>
    </Stack>
  );
}

// Text shown over a slide: its own, or the shared block when one text is reused.
function slideText(slide: BrandingSlide, textOverride: HeroSharedText | null | undefined, lang: string) {
  const source = textOverride ?? slide;
  return {
    hAlign: source.hAlign,
    vAlign: source.vAlign,
    title: resolveBrandingText(source.title, lang),
    subtitle: resolveBrandingText(source.subtitle, lang)
  };
}

// Proportions and framing of the header as a visitor with this very window sees
// it, so the card is a faithful preview instead of a fixed 5:2 box.
function SlidePreview({ slide, textOverride }: { slide: BrandingSlide; textOverride?: HeroSharedText | null }) {
  const { i18n: i18next } = useTranslation();
  const text = slideText(slide, textOverride, i18next.language);
  const formats = useHeroFormats();
  const viewportWidth = useViewportWidth();
  const currentKey = resolveHeroFormatKey(viewportWidth);
  const format = formats.find((entry) => entry.key === currentKey) ?? formats[0];
  return (
    <HeroPreview
      imageUrl={getBrandingImageUrl(slide.image) || defaultHeroImage}
      focus={heroFocusForFormat(slide.focus, slide.focusByFormat, currentKey)}
      hAlign={text.hAlign}
      vAlign={text.vAlign}
      title={text.title}
      subtitle={text.subtitle}
      ratio={heroFormatRatio(format)}
      statCards={format.cardsOverlay}
    />
  );
}

function SlideCard({
  slide,
  index,
  total,
  sharedText,
  onPatch,
  onMove,
  onRemove
}: {
  slide: BrandingSlide;
  index: number;
  total: number;
  // Set when the header uses one shared text — slide then edits only the image.
  sharedText?: HeroSharedText | null;
  onPatch: (patch: Partial<BrandingSlide>) => void;
  onMove: (delta: number) => void;
  onRemove: () => void;
}) {
  const { t, i18n: i18next } = useTranslation();
  const [framingOpen, setFramingOpen] = React.useState(false);
  const imageUrl = getBrandingImageUrl(slide.image) || defaultHeroImage;
  const focus = normalizeHeroFocus(slide.focus);
  const overrides = normalizeHeroOverrides(slide.focusByFormat);
  const ownFrames = heroOverrideCount(overrides);
  const customFraming = !isDefaultHeroFocus(slide.focus) || ownFrames > 0;

  const editorValue = LANGS.map((lang) => ({
    lang,
    title: slide.title[lang] || "",
    description: slide.subtitle[lang] || ""
  }));

  const handleEditorChange = (items: { lang: string; title: string; description?: string | null }[]) => {
    const title: Record<string, string> = {};
    const subtitle: Record<string, string> = {};
    items.forEach((item) => {
      title[item.lang] = item.title;
      subtitle[item.lang] = item.description || "";
    });
    onPatch({ title, subtitle });
  };

  return (
    <Paper sx={{ borderRadius: "12px", border: "1px solid var(--border)", p: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 1.5 }}>
        <Box
          sx={{
            width: 26,
            height: 26,
            borderRadius: "8px",
            display: "grid",
            placeItems: "center",
            backgroundColor: "rgba(37, 99, 235, 0.12)",
            color: "primary.main",
            fontWeight: 800,
            fontSize: 13
          }}
        >
          {index + 1}
        </Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {t("slide")} {index + 1}
        </Typography>
        {index === 0 && (
          <Chip size="small" variant="outlined" color="primary" label={t("slideMainBadge")} sx={{ fontWeight: 700 }} />
        )}
        <Box sx={{ flex: 1 }} />
        <Tooltip title={t("moveUp")}>
          <span>
            <IconButton size="small" disabled={index === 0} onClick={() => onMove(-1)}>
              <ArrowUpwardIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={t("moveDown")}>
          <span>
            <IconButton size="small" disabled={index === total - 1} onClick={() => onMove(1)}>
              <ArrowDownwardIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={t("delete")}>
          <IconButton size="small" color="error" onClick={onRemove}>
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      <Box
        sx={{
          display: "grid",
          gap: 2.5,
          gridTemplateColumns: { xs: "1fr", lg: sharedText ? "1fr" : "minmax(0, 5fr) minmax(0, 4fr)" },
          alignItems: "start"
        }}
      >
        <Stack spacing={1.5}>
          <SlidePreview slide={slide} textOverride={sharedText} />
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <UploadImageButton label={t("uploadImage")} onUploaded={(file) => onPatch({ image: file })} />
            <Button
              size="small"
              variant="outlined"
              startIcon={<CropOutlinedIcon />}
              onClick={() => setFramingOpen(true)}
            >
              {t("heroFraming")}
            </Button>
            {customFraming && (
              <Tooltip title={t("framingChipHint")}>
                <Chip
                  size="small"
                  variant="outlined"
                  icon={<CropOutlinedIcon />}
                  label={`${focus.x}% · ${focus.y}% · ${focus.zoom}%${ownFrames ? ` · +${ownFrames}` : ""}`}
                  onDelete={() => onPatch({ focus: DEFAULT_HERO_FOCUS, focusByFormat: {} })}
                  sx={{ fontWeight: 600 }}
                />
              </Tooltip>
            )}
            {slide.image && (
              <Button
                size="small"
                color="error"
                startIcon={<DeleteOutlineIcon />}
                onClick={() => onPatch({ image: null })}
              >
                {t("removeImage")}
              </Button>
            )}
            <Typography variant="caption" color="text.secondary">
              {slide.image ? t("heroImageHint") : `${t("noCustomImage")} · ${t("heroImageHint")}`}
            </Typography>
          </Stack>
          {framingOpen && (
            <HeroFramingDialog
              open
              onClose={() => setFramingOpen(false)}
              onApply={(nextFocus, nextOverrides) => {
                onPatch({ focus: nextFocus, focusByFormat: nextOverrides });
                setFramingOpen(false);
              }}
              slideIndex={index}
              imageUrl={imageUrl}
              focus={focus}
              focusByFormat={overrides}
              text={slideText(slide, sharedText, i18next.language)}
            />
          )}
          {!sharedText && (
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField
                select
                fullWidth
                size="small"
                label={t("posHorizontal")}
                value={slide.hAlign}
                onChange={(event) => onPatch({ hAlign: event.target.value as BrandingHAlign })}
              >
                <MenuItem value="left">{t("alignLeft")}</MenuItem>
                <MenuItem value="center">{t("alignCenterH")}</MenuItem>
                <MenuItem value="right">{t("alignRight")}</MenuItem>
              </TextField>
              <TextField
                select
                fullWidth
                size="small"
                label={t("posVertical")}
                value={slide.vAlign}
                onChange={(event) => onPatch({ vAlign: event.target.value as BrandingVAlign })}
              >
                <MenuItem value="top">{t("alignTop")}</MenuItem>
                <MenuItem value="center">{t("alignMiddle")}</MenuItem>
                <MenuItem value="bottom">{t("alignBottom")}</MenuItem>
              </TextField>
            </Stack>
          )}
        </Stack>

        {!sharedText && (
          <TranslationsEditor
            value={editorValue}
            onChange={handleEditorChange}
            showDescription
            titleLabel={t("title")}
            descriptionLabel={t("slideSubtitle")}
            helperText={t("slideTextHint")}
          />
        )}
      </Box>
    </Paper>
  );
}

export default function AppearancePage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [tab, setTab] = React.useState("hero");
  const [testRibbonEnabled, setTestRibbonEnabled] = React.useState(false);
  const [logoLight, setLogoLight] = React.useState<string | null>(null);
  const [logoDark, setLogoDark] = React.useState<string | null>(null);
  const [loginBackground, setLoginBackground] = React.useState<string | null>(null);
  const [intervalSec, setIntervalSec] = React.useState<number>(7);
  const [slides, setSlides] = React.useState<BrandingSlide[]>([]);
  const [heroTextMode, setHeroTextMode] = React.useState<"perSlide" | "shared">("perSlide");
  const [sharedText, setSharedText] = React.useState<HeroSharedText>(DEFAULT_SHARED_TEXT);
  // Serialized payload of the last loaded/saved state; used to detect unsaved edits.
  const [snapshot, setSnapshot] = React.useState<string | null>(null);
  const hydratedRef = React.useRef(false);

  const { data, isLoading } = useQuery({
    queryKey: ["app-settings-admin"],
    queryFn: fetchAdminAppSettings
  });

  // Hydrate the form once; background refetches must not wipe unsaved edits.
  React.useEffect(() => {
    if (!data || hydratedRef.current) return;
    hydratedRef.current = true;
    const branding = data.branding;
    // Slides stored before the framing controls existed carry no focus.
    const nextSlides = branding?.heroSlides?.length
      ? branding.heroSlides.map((slide) => ({
          ...slide,
          focus: normalizeHeroFocus(slide.focus),
          focusByFormat: normalizeHeroOverrides(slide.focusByFormat)
        }))
      : [currentDefaultSlide()];
    const nextSharedText = branding?.heroSharedText ?? DEFAULT_SHARED_TEXT;
    const nextMode = branding?.heroTextMode === "shared" ? "shared" : "perSlide";
    setTestRibbonEnabled(data.testRibbonEnabled);
    setLogoLight(branding?.logoLight ?? null);
    setLogoDark(branding?.logoDark ?? null);
    setLoginBackground(branding?.loginBackground ?? null);
    setIntervalSec(branding?.heroIntervalSec ?? 7);
    setSlides(nextSlides);
    setHeroTextMode(nextMode);
    setSharedText(nextSharedText);
    setSnapshot(
      JSON.stringify(
        buildPayload({
          testRibbonEnabled: data.testRibbonEnabled,
          slides: nextSlides,
          intervalSec: branding?.heroIntervalSec ?? 7,
          heroTextMode: nextMode,
          sharedText: nextSharedText,
          logoLight: branding?.logoLight ?? null,
          logoDark: branding?.logoDark ?? null,
          loginBackground: branding?.loginBackground ?? null
        })
      )
    );
  }, [data]);

  const payload = buildPayload({
    testRibbonEnabled,
    slides,
    intervalSec,
    heroTextMode,
    sharedText,
    logoLight,
    logoDark,
    loginBackground
  });
  const dirty = snapshot !== null && JSON.stringify(payload) !== snapshot;

  const changeTextMode = (mode: "perSlide" | "shared") => {
    setHeroTextMode(mode);
    // First switch to the shared mode starts from the current default header text.
    if (mode === "shared" && isTextEmpty(sharedText.title) && isTextEmpty(sharedText.subtitle)) {
      setSharedText(defaultSharedText());
    }
  };

  const updateMutation = useMutation({
    mutationFn: (body: SettingsPayload) => updateAppSettings(body),
    onSuccess: (_data, body) => {
      setSnapshot(JSON.stringify(body));
      setIntervalSec(body.branding.heroIntervalSec);
      queryClient.invalidateQueries({ queryKey: ["app-settings-admin"] });
      queryClient.invalidateQueries({ queryKey: ["app-settings"] });
      queryClient.invalidateQueries({ queryKey: ["public-branding"] });
      showToast({ message: t("settingsUpdated"), severity: "success" });
    },
    onError: (error) => showToast({ message: getErrorMessage(error, t("actionFailed")), severity: "error" })
  });

  const patchSlide = (id: string, patch: Partial<BrandingSlide>) => {
    setSlides((prev) => prev.map((slide) => (slide.id === id ? { ...slide, ...patch } : slide)));
  };

  const moveSlide = (index: number, delta: number) => {
    setSlides((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const saveButton = (
    <Button
      variant="contained"
      startIcon={<SaveOutlinedIcon />}
      onClick={() => updateMutation.mutate(payload)}
      disabled={!dirty || updateMutation.isPending || isLoading}
    >
      {t("saveChanges")}
    </Button>
  );

  return (
    <Page title={t("appearanceTab")} subtitle={t("appearanceSubtitle")} action={saveButton}>
      {isLoading ? (
        <LoadingState rows={4} />
      ) : (
        <>
          <Tabs
            value={tab}
            onChange={(_, next) => setTab(next)}
            sx={{ mb: 2.5, "& .MuiTab-root": { textTransform: "none", fontWeight: 600, minHeight: 48 } }}
          >
            <Tab
              value="hero"
              icon={<ViewCarouselOutlinedIcon fontSize="small" />}
              iconPosition="start"
              label={t("tabHero")}
            />
            <Tab
              value="branding"
              icon={<ImageOutlinedIcon fontSize="small" />}
              iconPosition="start"
              label={t("tabBranding")}
            />
            <Tab
              value="interface"
              icon={<TuneOutlinedIcon fontSize="small" />}
              iconPosition="start"
              label={t("tabInterface")}
            />
          </Tabs>

          {tab === "hero" && (
            <Stack spacing={2}>
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 2,
                  alignItems: "center",
                  justifyContent: "space-between"
                }}
              >
                <Box sx={{ flex: 1, minWidth: 260 }}>
                  <SectionTitle title={t("brandingHero")} hint={t("brandingHeroHint")} />
                </Box>
                <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
                  <TextField
                    select
                    size="small"
                    label={t("heroTextModeLabel")}
                    value={heroTextMode}
                    onChange={(event) => changeTextMode(event.target.value as "perSlide" | "shared")}
                    sx={{ width: 220 }}
                  >
                    <MenuItem value="perSlide">{t("textModePerSlide")}</MenuItem>
                    <MenuItem value="shared">{t("textModeShared")}</MenuItem>
                  </TextField>
                  <TextField
                    type="number"
                    size="small"
                    label={t("heroInterval")}
                    value={intervalSec}
                    onChange={(event) => setIntervalSec(Number(event.target.value))}
                    inputProps={{ min: MIN_INTERVAL, max: MAX_INTERVAL }}
                    sx={{ width: 180 }}
                  />
                  <Chip size="small" label={`${slides.length} / ${MAX_SLIDES}`} sx={{ fontWeight: 700 }} />
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    disabled={slides.length >= MAX_SLIDES}
                    onClick={() => setSlides((prev) => [...prev, newSlide()])}
                  >
                    {t("addSlide")}
                  </Button>
                </Stack>
              </Box>

              {heroTextMode === "shared" && (
                <Paper sx={cardSx}>
                  <Stack spacing={1.5}>
                    <SectionTitle title={t("sharedTextTitle")} hint={t("sharedTextHint")} />
                    <Box
                      sx={{
                        display: "grid",
                        gap: 2.5,
                        gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 5fr) minmax(0, 4fr)" },
                        alignItems: "start"
                      }}
                    >
                      <TranslationsEditor
                        value={LANGS.map((lang) => ({
                          lang,
                          title: sharedText.title[lang] || "",
                          description: sharedText.subtitle[lang] || ""
                        }))}
                        onChange={(items) => {
                          const title: Record<string, string> = {};
                          const subtitle: Record<string, string> = {};
                          items.forEach((item) => {
                            title[item.lang] = item.title;
                            subtitle[item.lang] = item.description || "";
                          });
                          setSharedText((prev) => ({ ...prev, title, subtitle }));
                        }}
                        showDescription
                        titleLabel={t("title")}
                        descriptionLabel={t("slideSubtitle")}
                        helperText={t("slideTextHint")}
                      />
                      <Stack spacing={1.5} sx={{ pt: { lg: 6 } }}>
                        <TextField
                          select
                          fullWidth
                          size="small"
                          label={t("posHorizontal")}
                          value={sharedText.hAlign}
                          onChange={(event) =>
                            setSharedText((prev) => ({ ...prev, hAlign: event.target.value as BrandingHAlign }))
                          }
                        >
                          <MenuItem value="left">{t("alignLeft")}</MenuItem>
                          <MenuItem value="center">{t("alignCenterH")}</MenuItem>
                          <MenuItem value="right">{t("alignRight")}</MenuItem>
                        </TextField>
                        <TextField
                          select
                          fullWidth
                          size="small"
                          label={t("posVertical")}
                          value={sharedText.vAlign}
                          onChange={(event) =>
                            setSharedText((prev) => ({ ...prev, vAlign: event.target.value as BrandingVAlign }))
                          }
                        >
                          <MenuItem value="top">{t("alignTop")}</MenuItem>
                          <MenuItem value="center">{t("alignMiddle")}</MenuItem>
                          <MenuItem value="bottom">{t("alignBottom")}</MenuItem>
                        </TextField>
                      </Stack>
                    </Box>
                  </Stack>
                </Paper>
              )}

              {slides.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  {t("noSlides")}
                </Typography>
              )}

              {slides.map((slide, index) => (
                <SlideCard
                  key={slide.id}
                  slide={slide}
                  index={index}
                  total={slides.length}
                  sharedText={heroTextMode === "shared" ? sharedText : null}
                  onPatch={(patch) => patchSlide(slide.id, patch)}
                  onMove={(delta) => moveSlide(index, delta)}
                  onRemove={() => setSlides((prev) => prev.filter((item) => item.id !== slide.id))}
                />
              ))}
            </Stack>
          )}

          {tab === "branding" && (
            <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
              <Paper sx={cardSx}>
                <Stack spacing={1.5}>
                  <SectionTitle title={t("brandingLogoLight")} hint={t("brandingLogoLightHint")} />
                  <ImageSlot value={logoLight} fallbackSrc={defaultLogoLight} onChange={setLogoLight} />
                </Stack>
              </Paper>
              <Paper sx={cardSx}>
                <Stack spacing={1.5}>
                  <SectionTitle title={t("brandingLogoDark")} hint={t("brandingLogoDarkHint")} />
                  <ImageSlot value={logoDark} fallbackSrc={defaultLogoDark} onChange={setLogoDark} darkBg />
                </Stack>
              </Paper>
              <Paper sx={{ ...cardSx, gridColumn: { xs: "auto", md: "1 / -1" } }}>
                <Stack spacing={1.5}>
                  <SectionTitle title={t("brandingLoginBg")} hint={t("brandingLoginBgHint")} />
                  <Box sx={{ maxWidth: 480 }}>
                    <ImageSlot
                      value={loginBackground}
                      fallbackSrc={defaultLoginImage}
                      onChange={setLoginBackground}
                      height={200}
                    />
                  </Box>
                </Stack>
              </Paper>
            </Box>
          )}

          {tab === "interface" && (
            <Paper sx={cardSx}>
              <FormControlLabel
                control={
                  <Switch
                    checked={testRibbonEnabled}
                    onChange={(event) => setTestRibbonEnabled(event.target.checked)}
                  />
                }
                label={t("testRibbonSetting")}
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5, ml: 6 }}>
                {t("testRibbonSettingHint")}
              </Typography>
            </Paper>
          )}

          {/* Compact floating save action — appears only while there are unsaved edits. */}
          {dirty && (
            <Box
              sx={{
                position: "sticky",
                bottom: 20,
                mt: 3,
                display: "flex",
                justifyContent: "flex-end",
                pointerEvents: "none",
                zIndex: 3
              }}
            >
              <Button
                variant="contained"
                size="large"
                startIcon={<SaveOutlinedIcon />}
                onClick={() => updateMutation.mutate(payload)}
                disabled={updateMutation.isPending}
                sx={{
                  pointerEvents: "auto",
                  borderRadius: "12px",
                  px: 3,
                  boxShadow: "0 12px 28px rgba(37, 99, 235, 0.45)"
                }}
              >
                {t("saveChanges")}
              </Button>
            </Box>
          )}
        </>
      )}
    </Page>
  );
}
