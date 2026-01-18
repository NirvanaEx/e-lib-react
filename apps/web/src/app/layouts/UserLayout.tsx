import React from "react";
import { Box, ButtonBase, Collapse, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Stack, Tooltip, Typography } from "@mui/material";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import LabelOutlinedIcon from "@mui/icons-material/LabelOutlined";
import SellOutlinedIcon from "@mui/icons-material/SellOutlined";
import BookmarkBorderOutlinedIcon from "@mui/icons-material/BookmarkBorderOutlined";
import LocalMallOutlinedIcon from "@mui/icons-material/LocalMallOutlined";
import LoyaltyOutlinedIcon from "@mui/icons-material/LoyaltyOutlined";
import LocalActivityOutlinedIcon from "@mui/icons-material/LocalActivityOutlined";
import StyleOutlinedIcon from "@mui/icons-material/StyleOutlined";
import ConfirmationNumberOutlinedIcon from "@mui/icons-material/ConfirmationNumberOutlined";
import LocalPlayOutlinedIcon from "@mui/icons-material/LocalPlayOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { useQuery } from "@tanstack/react-query";
import { BaseLayout } from "./BaseLayout";
import { useTranslation } from "react-i18next";
import { fetchMenu } from "../../features/files/files.api";
import { useSearchParams } from "react-router-dom";
import { SettingsDialog } from "../../features/settings/SettingsDialog";

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const items: { label: string; path: string; icon?: React.ReactNode }[] = [];
  const sidebarTop = ({ collapsed }: { collapsed: boolean }) => (
    <Box sx={{ width: "100%" }}>
      <ButtonBase
        onClick={() => window.location.reload()}
        sx={{
          width: "100%",
          borderRadius: 2,
          px: 0.5,
          py: 0.5,
          justifyContent: collapsed ? "center" : "flex-start"
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box sx={{ minWidth: collapsed ? 0 : 40, display: "flex", justifyContent: "center" }}>
            <MenuBookOutlinedIcon fontSize="small" />
          </Box>
          {!collapsed && (
            <Typography variant="subtitle1" sx={{ letterSpacing: "0.12em", fontWeight: 700 }}>
              E-LIB
            </Typography>
          )}
        </Stack>
      </ButtonBase>
    </Box>
  );

  const sidebarContent = ({ collapsed }: { collapsed: boolean }) => <UserSidebarMenu collapsed={collapsed} />;
  return (
    <>
      <BaseLayout
        title={t("user")}
        items={items}
        sidebarContent={sidebarContent}
        settingsAction={() => setSettingsOpen(true)}
        headerTitle={null}
        sidebarHeader={null}
        sidebarTop={sidebarTop}
        sidebarCollapsible
        sidebarPaddingTop={0.5}
      >
        {children}
      </BaseLayout>
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}

function UserSidebarMenu({ collapsed }: { collapsed: boolean }) {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data } = useQuery({ queryKey: ["user-menu-all"], queryFn: () => fetchMenu() });
  const [expandedCategories, setExpandedCategories] = React.useState<Set<number>>(new Set());

  const sections = data?.sections || [];
  const categories = data?.categories || [];
  const categoryById = React.useMemo(() => new Map(categories.map((cat: any) => [cat.id, cat])), [categories]);
  const selectedSectionId = Number(searchParams.get("sectionId") || 0) || null;
  const selectedCategoryId = Number(searchParams.get("categoryId") || 0) || null;

  const categoriesByParent = categories.reduce((acc: Record<string, any[]>, cat: any) => {
    const key = cat.parentId ? String(cat.parentId) : "root";
    if (!acc[key]) acc[key] = [];
    acc[key].push(cat);
    return acc;
  }, {});

  React.useEffect(() => {
    if (!selectedCategoryId) return;
    const parentIds = new Set<number>();
    let current = categoryById.get(selectedCategoryId);
    while (current?.parentId) {
      parentIds.add(current.parentId);
      current = categoryById.get(current.parentId);
    }
    if (parentIds.size === 0) return;
    setExpandedCategories((prev) => new Set([...prev, ...parentIds]));
  }, [categoryById, selectedCategoryId]);

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

  const toggleCategory = (id: number) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const itemSx = {
    borderRadius: 2.5,
    mb: 0.6,
    py: 0.9,
    px: 1,
    "&.Mui-selected": {
      backgroundColor: "rgba(29, 77, 79, 0.12)"
    },
    "&.Mui-selected:hover": {
      backgroundColor: "rgba(29, 77, 79, 0.16)"
    }
  };
  const menuIconSx = {
    width: 28,
    height: 28,
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    backgroundColor: "rgba(29, 77, 79, 0.12)",
    color: "primary.main"
  };
  const categoryLevelIcons = [
    LocalOfferOutlinedIcon,
    LabelOutlinedIcon,
    SellOutlinedIcon,
    BookmarkBorderOutlinedIcon,
    LocalMallOutlinedIcon,
    LoyaltyOutlinedIcon,
    LocalActivityOutlinedIcon,
    StyleOutlinedIcon,
    ConfirmationNumberOutlinedIcon,
    LocalPlayOutlinedIcon
  ];
  const renderCategoryIcon = (depth: number) => {
    const Icon = categoryLevelIcons[Math.min(depth, categoryLevelIcons.length - 1)];
    return <Icon fontSize="small" />;
  };

  const renderCategoryTree = (parentKey: string, depth: number) => {
    const items = categoriesByParent[parentKey] || [];
    return items.map((cat: any) => {
      const button = (
        <ListItemButton
          selected={selectedCategoryId === cat.id}
          onClick={() => {
            updateFilters(selectedSectionId, selectedCategoryId === cat.id ? null : cat.id);
            if (!collapsed && categoriesByParent[String(cat.id)]?.length && !expandedCategories.has(cat.id)) {
              toggleCategory(cat.id);
            }
          }}
          sx={{ ...itemSx, pr: 0.5, justifyContent: collapsed ? "center" : "flex-start" }}
        >
          <ListItemIcon sx={{ minWidth: collapsed ? 0 : 40, mr: collapsed ? 0 : 1 }}>
            <Box sx={menuIconSx}>{renderCategoryIcon(depth)}</Box>
          </ListItemIcon>
          {!collapsed && (
            <ListItemText
              primary={
                <Typography variant="body2" sx={{ fontWeight: selectedCategoryId === cat.id ? 700 : 600 }}>
                  {cat.title || `#${cat.id}`}
                </Typography>
              }
            />
          )}
          {!collapsed && categoriesByParent[String(cat.id)]?.length ? (
            <IconButton
              size="small"
              onClick={(event) => {
                event.stopPropagation();
                toggleCategory(cat.id);
              }}
            >
              {expandedCategories.has(cat.id) ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </IconButton>
          ) : null}
        </ListItemButton>
      );
      return (
        <Box key={cat.id} sx={{ pl: depth ? 1.5 : 0 }}>
          {collapsed ? (
            <Tooltip title={cat.title || `#${cat.id}`} placement="right">
              {button}
            </Tooltip>
          ) : (
            button
          )}
          {!collapsed && (
            <Collapse in={expandedCategories.has(cat.id)} timeout="auto" unmountOnExit>
              <Box sx={{ pt: 0.5 }}>{renderCategoryTree(String(cat.id), depth + 1)}</Box>
            </Collapse>
          )}
        </Box>
      );
    });
  };

  return (
    <Box>
      <Box>
        {!collapsed && (
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: "0.16em", fontWeight: 700 }}>
            {t("sections")}
          </Typography>
        )}
        {sections.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {t("noSections")}
          </Typography>
        ) : (
          <List sx={{ mt: collapsed ? 0 : 1 }} disablePadding>
            {sections.map((section: any) => {
              const button = (
                <ListItemButton
                  key={section.id}
                  selected={selectedSectionId === section.id}
                  onClick={() => updateFilters(selectedSectionId === section.id ? null : section.id, selectedCategoryId)}
                  sx={{ ...itemSx, justifyContent: collapsed ? "center" : "flex-start" }}
                >
                  <ListItemIcon sx={{ minWidth: collapsed ? 0 : 40, mr: collapsed ? 0 : 1 }}>
                    <Box sx={menuIconSx}>
                      <FolderOutlinedIcon fontSize="small" />
                    </Box>
                  </ListItemIcon>
                  {!collapsed && (
                    <ListItemText
                      primary={
                        <Typography variant="body2" sx={{ fontWeight: selectedSectionId === section.id ? 700 : 600 }}>
                          {section.title || `#${section.id}`}
                        </Typography>
                      }
                    />
                  )}
                </ListItemButton>
              );
              return collapsed ? (
                <Tooltip key={section.id} title={section.title || `#${section.id}`} placement="right">
                  {button}
                </Tooltip>
              ) : (
                button
              );
            })}
          </List>
        )}
      </Box>

      <Box sx={{ mt: collapsed ? 1 : 1.5 }}>
        {!collapsed && (
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: "0.16em", fontWeight: 700 }}>
            {t("categories")}
          </Typography>
        )}
        {categories.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {t("categoriesEmpty")}
          </Typography>
        ) : (
          <Box sx={{ mt: collapsed ? 0 : 1 }}>
            <List sx={{ m: 0, p: 0 }} disablePadding>
              {renderCategoryTree("root", 0)}
            </List>
          </Box>
        )}
      </Box>
    </Box>
  );
}
