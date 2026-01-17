import React from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { BaseLayout } from "./BaseLayout";
import { useTranslation } from "react-i18next";
import { fetchMenu } from "../../features/files/files.api";
import { useSearchParams } from "react-router-dom";

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const items: { label: string; path: string; icon?: React.ReactNode }[] = [];

  const sidebarContent = <UserSidebarMenu />;
  return (
    <BaseLayout title={t("user")} items={items} sidebarContent={sidebarContent} settingsPath="/users/settings">
      {children}
    </BaseLayout>
  );
}

function UserSidebarMenu() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data } = useQuery({ queryKey: ["user-menu"], queryFn: () => fetchMenu() });

  const sections = data?.sections || [];
  const categories = data?.categories || [];
  const selectedSectionId = Number(searchParams.get("sectionId") || 0) || null;
  const selectedCategoryId = Number(searchParams.get("categoryId") || 0) || null;

  const categoriesByParent = categories.reduce((acc: Record<string, any[]>, cat: any) => {
    const key = cat.parentId ? String(cat.parentId) : "root";
    if (!acc[key]) acc[key] = [];
    acc[key].push(cat);
    return acc;
  }, {});

  const updateFilters = (nextSectionId: number | null, nextCategoryId: number | null) => {
    const params = new URLSearchParams(searchParams);
    if (nextSectionId) {
      params.set("sectionId", String(nextSectionId));
    } else {
      params.delete("sectionId");
    }
    if (nextCategoryId) {
      params.set("categoryId", String(nextCategoryId));
    } else {
      params.delete("categoryId");
    }
    setSearchParams(params, { replace: true });
  };

  const renderCategoryTree = (parentKey: string, depth: number) => {
    const items = categoriesByParent[parentKey] || [];
    return items.map((cat: any) => (
      <Box key={cat.id} sx={{ pl: depth * 1.5, mb: 1 }}>
        <Button
          size="small"
          fullWidth
          variant={selectedCategoryId === cat.id ? "contained" : "text"}
          onClick={() => updateFilters(selectedSectionId, selectedCategoryId === cat.id ? null : cat.id)}
          sx={{ justifyContent: "flex-start", textTransform: "none", borderRadius: 2 }}
        >
          {cat.title}
        </Button>
        {renderCategoryTree(String(cat.id), depth + 1)}
      </Box>
    ));
  };

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: "0.12em" }}>
        {t("menu")}
      </Typography>
      <Stack spacing={1} sx={{ mt: 1 }}>
        <Button
          size="small"
          fullWidth
          variant={!selectedSectionId && !selectedCategoryId ? "contained" : "outlined"}
          onClick={() => updateFilters(null, null)}
          sx={{ textTransform: "none", borderRadius: 2 }}
        >
          {t("allFiles")}
        </Button>
      </Stack>
      {sections.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {t("noSections")}
        </Typography>
      ) : (
        <Stack spacing={1} sx={{ mt: 2 }}>
          {sections.map((section: any) => (
            <Button
              key={section.id}
              size="small"
              fullWidth
              variant={selectedSectionId === section.id ? "contained" : "outlined"}
              onClick={() => updateFilters(selectedSectionId === section.id ? null : section.id, selectedCategoryId)}
              sx={{ justifyContent: "flex-start", textTransform: "none", borderRadius: 2 }}
            >
              {section.title}
            </Button>
          ))}
        </Stack>
      )}

      <Typography variant="caption" color="text.secondary" sx={{ mt: 3, textTransform: "uppercase", letterSpacing: "0.12em" }}>
        {t("categories")}
      </Typography>
      {categories.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {t("categoriesEmpty")}
        </Typography>
      ) : (
        <Box sx={{ mt: 1 }}>{renderCategoryTree("root", 0)}</Box>
      )}
    </Box>
  );
}
