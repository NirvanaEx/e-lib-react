import React, { createContext, useContext, useState } from "react";
import { Alert, Snackbar } from "@mui/material";

type Toast = { message: string; severity?: "success" | "error" | "info" | "warning" };

type ToastContextValue = {
  showToast: (toast: Toast) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const [open, setOpen] = useState(false);

  const showToast = (value: Toast) => {
    setToast(value);
    setOpen(true);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Snackbar open={open} autoHideDuration={4000} onClose={() => setOpen(false)}>
        <Alert severity={toast?.severity || "info"} onClose={() => setOpen(false)} sx={{ width: "100%" }}>
          {toast?.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
