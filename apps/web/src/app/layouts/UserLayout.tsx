import React from "react";
import { Box, Chip, Stack, Typography } from "@mui/material";
import DescriptionIcon from "@mui/icons-material/Description";
import { useQuery } from "@tanstack/react-query";
import { BaseLayout } from "./BaseLayout";
import { useTranslation } from "react-i18next";
import { fetchMenu } from "../../features/files/files.api";

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const items = [
    { label: t("files"), path: "/user/files", icon: <DescriptionIcon /> }
  ];

  const sidebarContent = <UserSidebarMenu />;
  return (
    <BaseLayout title={t("user")} items={items} sidebarContent={sidebarContent} settingsPath="/user/settings">
      {children}
    </BaseLayout>
  );
}

function UserSidebarMenu() {
  const { t } = useTranslation();
  const { data } = useQuery({ queryKey: ["user-menu"], queryFn: () => fetchMenu() });

  const sections = data?.sections || [];
  const categories = data?.categories || [];

  const categoriesByParent = categories.reduce((acc: Record<string, any[]>, cat: any) => {
    const key = cat.parentId ? String(cat.parentId) : "root";
    if (!acc[key]) acc[key] = [];
    acc[key].push(cat);
    return acc;
  }, {});

  const renderCategoryTree = (parentKey: string, depth: number) => {
    const items = categoriesByParent[parentKey] || [];
    return items.map((cat: any) => (
      <Box key={cat.id} sx={{ pl: depth * 1.5, mb: 1 }}>
        <Typography variant="body2">{cat.title}</Typography>
        {renderCategoryTree(String(cat.id), depth + 1)}
      </Box>
    ));
  };

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: "0.12em" }}>
        {t("menu")}
      </Typography>
      {sections.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {t("noSections")}
        </Typography>
      ) : (
        <Stack spacing={1} sx={{ mt: 2 }}>
          {sections.map((section: any) => (
            <Chip key={section.id} size="small" label={section.title} />
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
