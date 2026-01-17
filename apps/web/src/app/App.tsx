import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { theme } from "./theme";
import { AuthProvider, useAuth } from "../shared/hooks/useAuth";
import { ToastProvider } from "../shared/ui/ToastProvider";
import LoginPage from "../features/auth/LoginPage";
import ChangeTempPasswordPage from "../features/auth/ChangeTempPasswordPage";
import AdminLayout from "./layouts/AdminLayout";
import ManageLayout from "./layouts/ManageLayout";
import UserLayout from "./layouts/UserLayout";
import UsersPage from "../features/admin-users/UsersPage";
import DepartmentsPage from "../features/departments/DepartmentsPage";
import SessionsPage from "../features/sessions/SessionsPage";
import AuditPage from "../features/audit/AuditPage";
import SectionsPage from "../features/sections/SectionsPage";
import CategoriesPage from "../features/categories/CategoriesPage";
import FilesPage from "../features/files/FilesPage";
import FileDetailsPage from "../features/files/FileDetailsPage";
import TrashPage from "../features/files/TrashPage";
import StatsPage from "../features/stats/StatsPage";
import UserFilesPage from "../features/files/UserFilesPage";
import UserFileDetailsPage from "../features/files/UserFileDetailsPage";
import SettingsPage from "../features/settings/SettingsPage";

const queryClient = new QueryClient();

function getDefaultRoute(role?: string | null) {
  if (role === "superadmin" || role === "admin") return "/admin/users";
  if (role === "manager") return "/manage/sections";
  return "/user/files";
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (user?.mustChangePassword) {
    return <Navigate to="/change-temp-password" replace />;
  }
  return <>{children}</>;
}

function RequireRole({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to={getDefaultRoute(user.role)} replace />;
  return <>{children}</>;
}

function DefaultRedirect() {
  const { user } = useAuth();
  return <Navigate to={getDefaultRoute(user?.role)} replace />;
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ToastProvider>
            <BrowserRouter>
              <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/change-temp-password" element={<ChangeTempPasswordPage />} />

              <Route
                path="/admin/users"
                element={
                  <RequireAuth>
                    <RequireRole roles={["superadmin", "admin"]}>
                      <AdminLayout>
                        <UsersPage />
                      </AdminLayout>
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="/admin/departments"
                element={
                  <RequireAuth>
                    <RequireRole roles={["superadmin", "admin"]}>
                      <AdminLayout>
                        <DepartmentsPage />
                      </AdminLayout>
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="/admin/sessions"
                element={
                  <RequireAuth>
                    <RequireRole roles={["superadmin", "admin"]}>
                      <AdminLayout>
                        <SessionsPage />
                      </AdminLayout>
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="/admin/audit"
                element={
                  <RequireAuth>
                    <RequireRole roles={["superadmin", "admin"]}>
                      <AdminLayout>
                        <AuditPage scope="admin" />
                      </AdminLayout>
                    </RequireRole>
                  </RequireAuth>
                }
              />

              <Route
                path="/manage/sections"
                element={
                  <RequireAuth>
                    <RequireRole roles={["superadmin", "admin", "manager"]}>
                      <ManageLayout>
                        <SectionsPage />
                      </ManageLayout>
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="/manage/categories"
                element={
                  <RequireAuth>
                    <RequireRole roles={["superadmin", "admin", "manager"]}>
                      <ManageLayout>
                        <CategoriesPage />
                      </ManageLayout>
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="/manage/files"
                element={
                  <RequireAuth>
                    <RequireRole roles={["superadmin", "admin", "manager"]}>
                      <ManageLayout>
                        <FilesPage />
                      </ManageLayout>
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="/manage/files/:id"
                element={
                  <RequireAuth>
                    <RequireRole roles={["superadmin", "admin", "manager"]}>
                      <ManageLayout>
                        <FileDetailsPage />
                      </ManageLayout>
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="/manage/trash"
                element={
                  <RequireAuth>
                    <RequireRole roles={["superadmin", "admin", "manager"]}>
                      <ManageLayout>
                        <TrashPage />
                      </ManageLayout>
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="/manage/stats"
                element={
                  <RequireAuth>
                    <RequireRole roles={["superadmin", "admin", "manager"]}>
                      <ManageLayout>
                        <StatsPage />
                      </ManageLayout>
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="/manage/audit"
                element={
                  <RequireAuth>
                    <RequireRole roles={["superadmin", "admin", "manager"]}>
                      <ManageLayout>
                        <AuditPage scope="manage" />
                      </ManageLayout>
                    </RequireRole>
                  </RequireAuth>
                }
              />

              <Route
                path="/user/files"
                element={
                  <RequireAuth>
                    <RequireRole roles={["superadmin", "admin", "user"]}>
                      <UserLayout>
                        <UserFilesPage />
                      </UserLayout>
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="/user/files/:id"
                element={
                  <RequireAuth>
                    <RequireRole roles={["superadmin", "admin", "user"]}>
                      <UserLayout>
                        <UserFileDetailsPage />
                      </UserLayout>
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="/user/settings"
                element={
                  <RequireAuth>
                    <RequireRole roles={["superadmin", "admin", "user"]}>
                      <UserLayout>
                        <SettingsPage />
                      </UserLayout>
                    </RequireRole>
                  </RequireAuth>
                }
              />

              <Route
                path="*"
                element={
                  <RequireAuth>
                    <DefaultRedirect />
                  </RequireAuth>
                }
              />
              </Routes>
            </BrowserRouter>
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
