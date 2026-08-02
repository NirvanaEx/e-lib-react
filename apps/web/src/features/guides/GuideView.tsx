import React from "react";
import { Box, Stack, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { GuideBlock, getGuideImageUrl } from "./guides.api";

// Мини-разметка текста блока: пустая строка — новый абзац, «- » — маркер,
// «1. » — нумерация, **жирный**. Ровно то же понимает генератор DOCX.
function inline(text: string, keyPrefix: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part, index) => {
    const bold = part.startsWith("**") && part.endsWith("**") && part.length > 4;
    return bold ? (
      <Box component="strong" key={`${keyPrefix}-${index}`} sx={{ fontWeight: 700 }}>
        {part.slice(2, -2)}
      </Box>
    ) : (
      <React.Fragment key={`${keyPrefix}-${index}`}>{part}</React.Fragment>
    );
  });
}

export function GuideBody({ body }: { body: string }) {
  const lines = String(body || "").replace(/\r\n/g, "\n").split("\n");
  const nodes: React.ReactNode[] = [];

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line) return;

    const bullet = line.match(/^[-—•]\s+(.*)$/);
    if (bullet) {
      nodes.push(
        <Stack key={index} direction="row" spacing={1.2} sx={{ pl: 0.5, mb: 0.6 }}>
          <Box sx={{ color: "primary.main", fontWeight: 700, lineHeight: 1.7 }}>•</Box>
          <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
            {inline(bullet[1], `b${index}`)}
          </Typography>
        </Stack>
      );
      return;
    }

    const numbered = line.match(/^(\d+)[.)]\s+(.*)$/);
    if (numbered) {
      nodes.push(
        <Stack key={index} direction="row" spacing={1.2} sx={{ pl: 0.5, mb: 0.6 }}>
          <Box sx={{ color: "primary.main", fontWeight: 700, lineHeight: 1.7, minWidth: 18 }}>
            {numbered[1]}.
          </Box>
          <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
            {inline(numbered[2], `n${index}`)}
          </Typography>
        </Stack>
      );
      return;
    }

    nodes.push(
      <Typography key={index} variant="body2" sx={{ lineHeight: 1.75, mb: 1.2 }}>
        {inline(line, `p${index}`)}
      </Typography>
    );
  });

  return <Box>{nodes}</Box>;
}

// Скриншот показывается в своём натуральном размере и только уменьшается,
// если не влезает: диалоговые окна узкие, и растянутые на всю ширину они
// превращаются в мыло.
export function GuideImage({
  image,
  title,
  number,
  width,
  height
}: {
  image: string;
  title: string;
  number: number;
  width?: number | null;
  height?: number | null;
}) {
  const { t } = useTranslation();
  const url = getGuideImageUrl(image);
  if (!url) return null;
  return (
    <Box sx={{ mt: 2 }}>
      <Box
        component="img"
        src={url}
        alt={title}
        loading="lazy"
        sx={{
          display: "block",
          mx: "auto",
          boxSizing: "content-box",
          width: width ? `min(${width}px, 100%)` : "100%",
          maxWidth: "100%",
          height: "auto",
          aspectRatio: width && height ? `${width} / ${height}` : undefined,
          borderRadius: "8px",
          border: "1px solid var(--border)",
          backgroundColor: "var(--surface-2)"
        }}
      />
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", mt: 0.8, textAlign: "center" }}
      >
        {t("guideFigure", { number })}. {title}
      </Typography>
    </Box>
  );
}

export function GuideBlockContent({ block }: { block: GuideBlock }) {
  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
        {block.number}. {block.title}
      </Typography>
      <GuideBody body={block.body} />
      {block.image && (
        <GuideImage
          image={block.image}
          title={block.title}
          number={block.number}
          width={block.imageWidth}
          height={block.imageHeight}
        />
      )}
    </Box>
  );
}
