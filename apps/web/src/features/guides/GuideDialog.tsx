import React from "react";
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  Divider,
  IconButton,
  List,
  ListItemButton,
  Stack,
  Typography
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { LoadingState } from "../../shared/ui/LoadingState";
import { EmptyState } from "../../shared/ui/EmptyState";
import { useToast } from "../../shared/ui/ToastProvider";
import { GuideBlockContent } from "./GuideView";
import { GuideKey, downloadGuideDocx, fetchGuide } from "./guides.api";

/**
 * Инструкция открывается окном поверх текущей страницы: слева список разделов
 * для быстрого перехода, справа сам текст. Так сотрудник не теряет место, на
 * котором остановился, — закрыл окно и продолжил работу.
 */
export function GuideDialog({
  open,
  onClose,
  guideKey,
  title
}: {
  open: boolean;
  onClose: () => void;
  guideKey: GuideKey;
  title?: string;
}) {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const [downloading, setDownloading] = React.useState(false);
  const [activeId, setActiveId] = React.useState<number | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const blockRefs = React.useRef(new Map<number, HTMLDivElement>());
  const scrollLockRef = React.useRef<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["guide", guideKey, i18n.language],
    queryFn: () => fetchGuide(guideKey),
    enabled: open
  });

  const blocks = data?.blocks || [];

  React.useEffect(() => {
    if (open && blocks.length) setActiveId((current) => current ?? blocks[0].id);
  }, [open, blocks]);

  // Подсветка в списке идёт за прокруткой: активен последний заголовок,
  // который уже проехал верх области чтения.
  const handleScroll = () => {
    // Пока идёт плавная прокрутка по клику, промежуточные позиции игнорируем.
    if (scrollLockRef.current && Date.now() < scrollLockRef.current) return;
    const container = contentRef.current;
    if (!container) return;
    const top = container.getBoundingClientRect().top;
    let current: number | null = null;
    blocks.forEach((block) => {
      const node = blockRefs.current.get(block.id);
      if (node && node.getBoundingClientRect().top - top <= 24) current = block.id;
    });
    setActiveId(current ?? blocks[0]?.id ?? null);
  };

  const scrollTo = (id: number) => {
    const node = blockRefs.current.get(id);
    const container = contentRef.current;
    if (!node || !container) return;
    scrollLockRef.current = Date.now() + 800;
    container.scrollTo({ top: node.offsetTop - 12, behavior: "smooth" });
    setActiveId(id);
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadGuideDocx(guideKey);
    } catch {
      showToast({ message: t("guideDownloadFailed"), severity: "error" });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      PaperProps={{ sx: { height: { xs: "100%", md: "88vh" }, maxHeight: "none" } }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={2}
        sx={{ px: 2.5, py: 1.75 }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {title || t("guide")}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {guideKey === "admin" ? t("guideAdminSubtitle") : t("guideUserSubtitle")}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadOutlinedIcon />}
            onClick={handleDownload}
            disabled={downloading || !blocks.length}
          >
            {t("guideDownloadDocx")}
          </Button>
          <IconButton onClick={onClose} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Stack>
      <Divider />

      <DialogContent sx={{ p: 0, display: "flex", overflow: "hidden" }}>
        {isLoading ? (
          <Box sx={{ p: 3, width: "100%" }}>
            <LoadingState rows={5} />
          </Box>
        ) : !blocks.length ? (
          <Box sx={{ p: 3, width: "100%" }}>
            <EmptyState title={t("guideEmpty")} />
          </Box>
        ) : (
          <>
            <Box
              sx={{
                width: 300,
                flexShrink: 0,
                borderRight: "1px solid var(--border)",
                overflowY: "auto",
                display: { xs: "none", md: "block" },
                backgroundColor: "var(--surface-2)"
              }}
            >
              <Typography
                variant="overline"
                color="text.secondary"
                sx={{ display: "block", px: 2, pt: 2, pb: 0.5, fontWeight: 700 }}
              >
                {t("guideContents")}
              </Typography>
              <List dense disablePadding sx={{ pb: 2 }}>
                {blocks.map((block) => (
                  <ListItemButton
                    key={block.id}
                    selected={activeId === block.id}
                    onClick={() => scrollTo(block.id)}
                    sx={{
                      alignItems: "flex-start",
                      py: 0.75,
                      px: 2,
                      borderLeft: "3px solid transparent",
                      "&.Mui-selected": {
                        backgroundColor: "transparent",
                        borderLeftColor: "primary.main"
                      },
                      "&.Mui-selected:hover": { backgroundColor: "action.hover" }
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: activeId === block.id ? 700 : 500,
                        color: activeId === block.id ? "primary.main" : "text.secondary",
                        lineHeight: 1.4
                      }}
                    >
                      {block.number}. {block.title}
                    </Typography>
                  </ListItemButton>
                ))}
              </List>
            </Box>

            <Box
              ref={contentRef}
              onScroll={handleScroll}
              sx={{ flex: 1, overflowY: "auto", px: { xs: 2, md: 4 }, py: 3, position: "relative" }}
            >
              {blocks.map((block, index) => (
                <Box
                  key={block.id}
                  ref={(node: HTMLDivElement | null) => {
                    if (node) blockRefs.current.set(block.id, node);
                    else blockRefs.current.delete(block.id);
                  }}
                  sx={{ pb: 4, mb: index === blocks.length - 1 ? 0 : 3, borderBottom: index === blocks.length - 1 ? "none" : "1px solid var(--border)" }}
                >
                  <GuideBlockContent block={block} />
                </Box>
              ))}
            </Box>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
