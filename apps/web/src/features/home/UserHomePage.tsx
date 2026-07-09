import React from "react";
import { Box, ButtonBase, Paper, Skeleton, Stack, Typography } from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import GridViewOutlinedIcon from "@mui/icons-material/GridViewOutlined";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import BalanceOutlinedIcon from "@mui/icons-material/BalanceOutlined";
import AccountBalanceOutlinedIcon from "@mui/icons-material/AccountBalanceOutlined";
import FlightOutlinedIcon from "@mui/icons-material/FlightOutlined";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { fetchMenu, fetchUserFiles, fetchUserStats } from "../files/files.api";
import UserFilesPage from "../files/UserFilesPage";
import { LibraryIcon } from "../../shared/ui/iconLibrary";
import { FileTypeBadge } from "../files/fileVisuals";
import { formatDate } from "../../shared/utils/date";
import heroImage from "../../assets/main-back.jpg";

const FILTER_PARAMS = ["q", "sectionId", "categoryId", "sectionIds", "categoryIds", "departmentIds"];

const sectionIcons = [
  BalanceOutlinedIcon,
  AccountBalanceOutlinedIcon,
  FlightOutlinedIcon,
  ArticleOutlinedIcon,
  MenuBookOutlinedIcon,
  DescriptionOutlinedIcon
];
const sectionTones = ["#2563eb", "#7c3aed", "#0ea5e9", "#0d9488", "#d97706", "#db2777"];

export default function UserHomePage() {
  const [searchParams] = useSearchParams();
  const hasFilters = FILTER_PARAMS.some((param) => searchParams.get(param));

  if (hasFilters) {
    return <UserFilesPage />;
  }

  return <HomeContent />;
}

function HomeContent() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const { data: statsData, isLoading: statsLoading } = useQuery({ queryKey: ["user-stats"], queryFn: fetchUserStats });
  const { data: menuData, isLoading: menuLoading } = useQuery({ queryKey: ["user-menu-all"], queryFn: () => fetchMenu() });
  const { data: latestData, isLoading: latestLoading } = useQuery({
    queryKey: ["user-files", "latest"],
    queryFn: () => fetchUserFiles({ page: 1, pageSize: 6 })
  });

  const numberFormat = React.useMemo(() => new Intl.NumberFormat(i18n.language || "ru"), [i18n.language]);
  const sections = menuData?.sections || [];
  const latestFiles = latestData?.data || [];

  const statCards = [
    {
      key: "total",
      label: t("totalDocuments"),
      value: statsData?.totalFiles,
      icon: <DescriptionOutlinedIcon fontSize="small" />,
      tone: "#2563eb",
      linkLabel: t("viewAll"),
      onClick: () => navigate("/users/files")
    },
    {
      key: "categories",
      label: t("categories"),
      value: statsData?.categoriesCount,
      icon: <GridViewOutlinedIcon fontSize="small" />,
      tone: "#7c3aed",
      linkLabel: t("viewAll"),
      onClick: () => navigate("/users/files")
    },
    {
      key: "new",
      label: t("newDocuments"),
      value: statsData?.newFiles,
      icon: <AccessTimeOutlinedIcon fontSize="small" />,
      tone: "#0d9488",
      linkLabel: t("viewAll"),
      onClick: () => navigate("/users/files")
    },
    {
      key: "downloads",
      label: t("downloads"),
      value: statsData?.totalDownloads,
      icon: <FileDownloadOutlinedIcon fontSize="small" />,
      tone: "#d97706",
      linkLabel: null,
      onClick: undefined
    }
  ];

  return (
    <Box sx={{ width: "100%" }}>
      <Box sx={{ position: "relative", pb: { xs: 0, md: 7 } }}>
        <Box
          sx={{
            borderRadius: "12px",
            overflow: "hidden",
            position: "relative",
            minHeight: { xs: 190, md: 260 },
            display: "flex",
            alignItems: "center",
            backgroundImage: `linear-gradient(95deg, rgba(8, 28, 57, 0.92) 0%, rgba(10, 34, 66, 0.72) 42%, rgba(12, 42, 82, 0.08) 100%), url(${heroImage})`,
            backgroundSize: "cover",
            backgroundPosition: "right 68%"
          }}
        >
          <Box sx={{ px: { xs: 3, md: 5 }, py: { xs: 3.5, md: 5 }, pb: { xs: 3.5, md: 10 }, maxWidth: 600 }}>
            <Typography variant="h3" sx={{ color: "#fff", fontWeight: 800, letterSpacing: "-0.02em", fontSize: { xs: 24, md: 32 } }}>
              {t("homeHeroTitle")}
            </Typography>
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.82)", mt: 1.25, maxWidth: 500 }}>
              {t("homeHeroSubtitle")}
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
            px: { xs: 0, md: 4 },
            mt: { xs: 2, md: 0 },
            position: { xs: "static", md: "absolute" },
            left: 0,
            right: 0,
            bottom: 0
          }}
        >
          {statCards.map((card) => (
            <Paper
              key={card.key}
              onClick={card.onClick}
              sx={{
                p: 1.75,
                borderRadius: "10px",
                border: "1px solid var(--border)",
                backgroundColor: "var(--surface)",
                boxShadow: "var(--shadow)",
                cursor: card.onClick ? "pointer" : "default",
                transition: "transform 0.15s ease, border-color 0.15s ease",
                "&:hover": card.onClick ? { transform: "translateY(-2px)", borderColor: "primary.main" } : undefined
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="flex-start">
                <Box
                  sx={{
                    width: 38,
                    height: 38,
                    borderRadius: "10px",
                    display: "grid",
                    placeItems: "center",
                    backgroundColor: `${card.tone}1a`,
                    color: card.tone,
                    flexShrink: 0
                  }}
                >
                  {card.icon}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: "block" }} noWrap>
                    {card.label}
                  </Typography>
                  {statsLoading ? (
                    <Skeleton width={64} height={30} />
                  ) : (
                    <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                      {numberFormat.format(Number(card.value || 0))}
                    </Typography>
                  )}
                  {card.linkLabel && (
                    <Typography variant="caption" sx={{ color: "primary.main", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 0.5 }}>
                      {card.linkLabel}
                      <ArrowForwardIcon sx={{ fontSize: 12 }} />
                    </Typography>
                  )}
                </Box>
              </Stack>
            </Paper>
          ))}
        </Box>
      </Box>

      <Box
        sx={{
          display: "grid",
          gap: 3,
          mt: 4,
          gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 3fr) minmax(0, 2fr)" },
          alignItems: "start"
        }}
      >
        <Box>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography variant="h6">{t("mainSections")}</Typography>
            <SectionLink label={t("viewAll")} onClick={() => navigate("/users/files")} />
          </Stack>
          {menuLoading ? (
            <Box sx={{ display: "grid", gap: 1.25, gridTemplateColumns: "repeat(auto-fill, minmax(145px, 1fr))" }}>
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={index} variant="rounded" height={104} sx={{ borderRadius: "10px" }} />
              ))}
            </Box>
          ) : sections.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t("noSections")}
            </Typography>
          ) : (
            <Box sx={{ display: "grid", gap: 1.25, gridTemplateColumns: "repeat(auto-fill, minmax(145px, 1fr))" }}>
              {sections.map((section: any, index: number) => {
                const FallbackIcon = sectionIcons[index % sectionIcons.length];
                const tone = section.iconColor || sectionTones[index % sectionTones.length];
                return (
                  <Paper
                    key={section.id}
                    onClick={() => navigate(`/users?sectionId=${section.id}`)}
                    sx={{
                      p: 1.5,
                      borderRadius: "10px",
                      border: "1px solid var(--border)",
                      backgroundColor: "var(--surface)",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: 1,
                      transition: "border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease",
                      "&:hover": {
                        borderColor: "primary.main",
                        transform: "translateY(-2px)",
                        boxShadow: "var(--shadow)"
                      }
                    }}
                  >
                    <Box
                      sx={{
                        width: 34,
                        height: 34,
                        borderRadius: "8px",
                        display: "grid",
                        placeItems: "center",
                        backgroundColor: `${tone}1a`,
                        color: tone
                      }}
                    >
                      <LibraryIcon name={section.icon} fallback={FallbackIcon} sx={{ fontSize: 18 }} />
                    </Box>
                    <Box>
                      <Typography
                        sx={{
                          fontWeight: 700,
                          fontSize: 13,
                          lineHeight: 1.3,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          minHeight: 34
                        }}
                      >
                        {section.title || `#${section.id}`}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        {t("documentCount", { count: Number(section.fileCount || 0) })}
                      </Typography>
                    </Box>
                  </Paper>
                );
              })}
            </Box>
          )}
        </Box>

        <Paper
          sx={{
            borderRadius: "10px",
            border: "1px solid var(--border)",
            backgroundColor: "var(--surface)",
            overflow: "hidden"
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2.5, pt: 2, pb: 1.5 }}>
            <Typography variant="h6" sx={{ fontSize: 17 }}>
              {t("newDocuments")}
            </Typography>
            <SectionLink label={t("viewAll")} onClick={() => navigate("/users/files")} />
          </Stack>
          {latestLoading ? (
            <Stack spacing={1.5} sx={{ px: 2.5, pb: 2.5 }}>
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} variant="rounded" height={48} sx={{ borderRadius: "8px" }} />
              ))}
            </Stack>
          ) : latestFiles.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ px: 2.5, pb: 2.5 }}>
              {t("noFiles")}
            </Typography>
          ) : (
            <Box sx={{ pb: 1 }}>
              {latestFiles.map((row: any) => (
                <ButtonBase
                  key={row.id}
                  onClick={() => navigate(`/users/${row.id}`)}
                  sx={{
                    width: "100%",
                    display: "flex",
                    justifyContent: "flex-start",
                    textAlign: "left",
                    gap: 1.5,
                    px: 2.5,
                    py: 1.25,
                    borderTop: "1px solid var(--border)",
                    "&:hover": { backgroundColor: "var(--surface-2)" }
                  }}
                >
                  <FileTypeBadge ext={(row.availableAssetExts || [])[0]} small />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                      {row.title || t("file")}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
                      {formatDate(row.createdAt)}
                    </Typography>
                  </Box>
                </ButtonBase>
              ))}
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
}

function SectionLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        color: "primary.main",
        fontWeight: 700,
        fontSize: 13,
        fontFamily: "inherit",
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        borderRadius: "6px",
        px: 0.75,
        py: 0.25
      }}
    >
      {label}
      <ArrowForwardIcon sx={{ fontSize: 14 }} />
    </ButtonBase>
  );
}
