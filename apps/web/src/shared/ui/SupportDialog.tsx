import React from "react";
import { Box, Button, Dialog, DialogActions, DialogContent, Stack, Typography } from "@mui/material";
import SupportAgentOutlinedIcon from "@mui/icons-material/SupportAgentOutlined";
import LocalPhoneOutlinedIcon from "@mui/icons-material/LocalPhoneOutlined";
import { useTranslation } from "react-i18next";
import { HELP_EXTENSIONS, HELP_PHONE, HELP_PHONE_HREF } from "../constants/support";

export function SupportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: "14px" } }}>
      <DialogContent sx={{ pt: 3.5, pb: 2 }}>
        <Stack spacing={2.5} alignItems="center">
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              backgroundColor: "rgba(37, 99, 235, 0.1)",
              color: "primary.main"
            }}
          >
            <SupportAgentOutlinedIcon />
          </Box>

          <Stack spacing={0.5} alignItems="center">
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {t("helpService")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
              {t("helpOrg")}
            </Typography>
          </Stack>

          <Box sx={{ width: "100%" }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mb: 1, textAlign: "center" }}
            >
              {t("helpExtensions")}
            </Typography>
            <Stack direction="row" spacing={1}>
              {HELP_EXTENSIONS.map((extension) => (
                <Typography
                  key={extension}
                  variant="body2"
                  sx={{
                    flex: 1,
                    textAlign: "center",
                    py: 1,
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--surface-2)",
                    fontWeight: 700,
                    letterSpacing: "0.04em"
                  }}
                >
                  {extension}
                </Typography>
              ))}
            </Stack>
          </Box>

          <Stack
            component="a"
            href={HELP_PHONE_HREF}
            direction="row"
            spacing={1}
            alignItems="center"
            justifyContent="center"
            sx={{
              width: "100%",
              py: 1.25,
              borderRadius: "8px",
              border: "1px solid var(--border)",
              color: "primary.main",
              transition: "border-color 0.15s ease, background-color 0.15s ease",
              "&:hover": { borderColor: "primary.main", backgroundColor: "rgba(37, 99, 235, 0.04)" }
            }}
          >
            <LocalPhoneOutlinedIcon fontSize="small" />
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {HELP_PHONE}
            </Typography>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button fullWidth variant="contained" onClick={onClose} sx={{ borderRadius: "8px" }}>
          {t("close")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
