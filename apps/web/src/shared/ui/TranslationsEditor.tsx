import React from "react";
import { Box, Stack, Tab, Tabs, TextField, Typography } from "@mui/material";

const languages = ["ru", "en", "uz"] as const;

type Lang = (typeof languages)[number];

type TranslationItem = {
  lang: Lang;
  title: string;
  description?: string | null;
};

export function TranslationsEditor({
  value,
  onChange,
  showDescription = false,
  titleLabel = "Title",
  descriptionLabel = "Description",
  helperText
}: {
  value: TranslationItem[];
  onChange: (value: TranslationItem[]) => void;
  showDescription?: boolean;
  titleLabel?: string;
  descriptionLabel?: string;
  helperText?: string;
}) {
  const [currentLang, setCurrentLang] = React.useState<Lang>("ru");

  const byLang = React.useMemo(() => {
    const map = new Map<Lang, TranslationItem>();
    value.forEach((item) => map.set(item.lang, item));
    return map;
  }, [value]);

  const current = byLang.get(currentLang) || { lang: currentLang, title: "", description: "" };

  const updateField = (field: "title" | "description", next: string) => {
    const nextValue = value.filter((item) => item.lang !== currentLang);
    nextValue.push({
      lang: currentLang,
      title: field === "title" ? next : current.title,
      description: field === "description" ? next : current.description || ""
    });
    onChange(nextValue);
  };

  return (
    <Box>
      <Tabs value={currentLang} onChange={(_, next) => setCurrentLang(next)}>
        {languages.map((lang) => (
          <Tab key={lang} label={lang.toUpperCase()} value={lang} />
        ))}
      </Tabs>
      <Box sx={{ mt: 2 }}>
        <Stack spacing={2}>
          <TextField
            label={titleLabel}
            value={current.title || ""}
            onChange={(event) => updateField("title", event.target.value)}
            fullWidth
          />
          {showDescription && (
            <TextField
              label={descriptionLabel}
              value={current.description || ""}
              onChange={(event) => updateField("description", event.target.value)}
              multiline
              minRows={3}
              fullWidth
            />
          )}
          {helperText && (
            <Typography variant="caption" color="text.secondary">
              {helperText}
            </Typography>
          )}
        </Stack>
      </Box>
    </Box>
  );
}
