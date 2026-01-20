import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { theme } from "./theme";
import { AuthProvider, useAuth } from "../shared/hooks/useAuth";
import { ToastProvider } from "../shared/ui/ToastProvider";
import LoginPage from "../features/auth/LoginPage";
import ChangeTempPasswordPage from "../features/auth/ChangeTempPasswordPage";
import DashboardLayout from "./layouts/DashboardLayout";
import UserLayout from "./layouts/UserLayout";
import UsersPage from "../features/admin-users/UsersPage";
import RolesPage from "../features/roles/RolesPage";
import DepartmentsPage from "../features/departments/DepartmentsPage";
import SessionsPage from "../features/sessions/SessionsPage";
import AuditPage from "../features/audit/AuditPage";
import ContentPage from "../features/content-pages/ContentPage";
import SectionsPage from "../features/sections/SectionsPage";
import CategoriesPage from "../features/categories/CategoriesPage";
import FilesPage from "../features/files/FilesPage";
import FileRequestsPage from "../features/files/FileRequestsPage";
import FileDetailsPage from "../features/files/FileDetailsPage";
import TrashPage from "../features/files/TrashPage";
import StatsPage from "../features/stats/StatsPage";
import UserFilesPage from "../features/files/UserFilesPage";
import UserLibraryPage from "../features/files/UserLibraryPage";
import MyLibraryLayout from "./layouts/MyLibraryLayout";
import UserFileDetailsPage from "../features/files/UserFileDetailsPage";
import SettingsPage from "../features/settings/SettingsPage";
import { getDefaultRoute, hasAccess } from "../shared/utils/access";
import i18n from "./i18n";

const queryClient = new QueryClient();

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isInitialized } = useAuth();
  if (!isInitialized) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user?.mustChangePassword) {
    return <Navigate to="/change-temp-password" replace />;
  }
  return <>{children}</>;
}

function RequireAccess({ permissions, children }: { permissions: string[]; children: React.ReactNode }) {
  const { user, isInitialized } = useAuth();
  if (!isInitialized) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!hasAccess(user, permissions)) return <Navigate to={getDefaultRoute(user)} replace />;
  return <>{children}</>;
}

function RequireRole({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const { user, isInitialized } = useAuth();
  if (!isInitialized) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to={getDefaultRoute(user)} replace />;
  return <>{children}</>;
}

function RequireFileSubmit({ children }: { children: React.ReactNode }) {
  const { user, isInitialized } = useAuth();
  if (!isInitialized) return null;
  if (!user?.canSubmitFiles) return <Navigate to="/users/my-library/favorites" replace />;
  return <>{children}</>;
}

function DefaultRedirect() {
  const { user, isInitialized } = useAuth();
  if (!isInitialized) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={getDefaultRoute(user)} replace />;
}

function MyLibraryRedirect() {
  const { user, isInitialized } = useAuth();
  if (!isInitialized) return null;
  const target = user?.canSubmitFiles ? "/users/my-library/requests" : "/users/my-library/favorites";
  return <Navigate to={target} replace />;
}

export default function App() {
  React.useEffect(() => {
    const handleLanguageChange = () => {
      queryClient.invalidateQueries();
    };
    i18n.on("languageChanged", handleLanguageChange);
    return () => {
      i18n.off("languageChanged", handleLanguageChange);
    };
  }, []);

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
                path="/dashboard/users"
                element={
                  <RequireAuth>
                    <RequireAccess permissions={["dashboard.access", "user.read"]}>
                      <DashboardLayout>
                        <UsersPage />
                      </DashboardLayout>
                    </RequireAccess>
                  </RequireAuth>
                }
              />
              <Route
                path="/dashboard/roles"
                element={
                  <RequireAuth>
                    <RequireAccess permissions={["dashboard.access", "role.read"]}>
                      <DashboardLayout>
                        <RolesPage />
                      </DashboardLayout>
                    </RequireAccess>
                  </RequireAuth>
                }
              />
              <Route
                path="/dashboard/departments"
                element={
                  <RequireAuth>
                    <RequireAccess permissions={["dashboard.access", "department.read"]}>
                      <DashboardLayout>
                        <DepartmentsPage />
                      </DashboardLayout>
                    </RequireAccess>
                  </RequireAuth>
                }
              />
              <Route
                path="/dashboard/sessions"
                element={
                  <RequireAuth>
                    <RequireAccess permissions={["dashboard.access", "session.read"]}>
                      <DashboardLayout>
                        <SessionsPage />
                      </DashboardLayout>
                    </RequireAccess>
                  </RequireAuth>
                }
              />
              <Route
                path="/dashboard/audit"
                element={
                  <RequireAuth>
                    <RequireAccess permissions={["dashboard.access", "audit.read"]}>
                      <DashboardLayout>
                        <AuditPage />
                      </DashboardLayout>
                    </RequireAccess>
                  </RequireAuth>
                }
              />
              <Route
                path="/dashboard/content"
                element={
                  <RequireAuth>
                    <RequireAccess permissions={["dashboard.access", "content.read"]}>
                      <DashboardLayout>
                        <ContentPage />
                      </DashboardLayout>
                    </RequireAccess>
                  </RequireAuth>
                }
              />

              <Route
                path="/dashboard/sections"
                element={
                  <RequireAuth>
                    <RequireAccess permissions={["dashboard.access", "section.read"]}>
                      <DashboardLayout>
                        <SectionsPage />
                      </DashboardLayout>
                    </RequireAccess>
                  </RequireAuth>
                }
              />
              <Route
                path="/dashboard/categories"
                element={
                  <RequireAuth>
                    <RequireAccess permissions={["dashboard.access", "category.read"]}>
                      <DashboardLayout>
                        <CategoriesPage />
                      </DashboardLayout>
                    </RequireAccess>
                  </RequireAuth>
                }
              />
              <Route
                path="/dashboard/files"
                element={
                  <RequireAuth>
                    <RequireAccess permissions={["dashboard.access", "file.read"]}>
                      <DashboardLayout>
                        <FilesPage />
                      </DashboardLayout>
                    </RequireAccess>
                  </RequireAuth>
                }
              />
              <Route
                path="/dashboard/requests"
                element={
                  <RequireAuth>
                    <RequireAccess permissions={["dashboard.access", "file.read"]}>
                      <DashboardLayout>
                        <FileRequestsPage />
                      </DashboardLayout>
                    </RequireAccess>
                  </RequireAuth>
                }
              />
              <Route
                path="/dashboard/files/:id"
                element={
                  <RequireAuth>
                    <RequireAccess permissions={["dashboard.access", "file.read"]}>
                      <DashboardLayout>
                        <FileDetailsPage />
                      </DashboardLayout>
                    </RequireAccess>
                  </RequireAuth>
                }
              />
              <Route
                path="/dashboard/trash"
                element={
                  <RequireAuth>
                    <RequireAccess permissions={["dashboard.access", "file.trash.read"]}>
                      <DashboardLayout>
                        <TrashPage />
                      </DashboardLayout>
                    </RequireAccess>
                  </RequireAuth>
                }
              />
              <Route
                path="/dashboard/stats"
                element={
                  <RequireAuth>
                    <RequireAccess permissions={["dashboard.access", "stats.read"]}>
                      <DashboardLayout>
                        <StatsPage />
                      </DashboardLayout>
                    </RequireAccess>
                  </RequireAuth>
                }
              />

              <Route
                path="/users"
                element={
                  <RequireAuth>
                    <RequireRole roles={["superadmin", "admin", "manager", "user"]}>
                      <UserLayout>
                        <UserFilesPage />
                      </UserLayout>
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="/users/my-library"
                element={
                  <RequireAuth>
                    <RequireRole roles={["superadmin", "admin", "manager", "user"]}>
                      <MyLibraryRedirect />
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="/users/my-library/requests"
                element={
                  <RequireAuth>
                    <RequireRole roles={["superadmin", "admin", "manager", "user"]}>
                      <RequireFileSubmit>
                        <MyLibraryLayout>
                          <UserLibraryPage view="requests" />
                        </MyLibraryLayout>
                      </RequireFileSubmit>
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="/users/my-library/files"
                element={
                  <RequireAuth>
                    <RequireRole roles={["superadmin", "admin", "manager", "user"]}>
                      <RequireFileSubmit>
                        <MyLibraryLayout>
                          <UserLibraryPage view="files" />
                        </MyLibraryLayout>
                      </RequireFileSubmit>
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="/users/my-library/favorites"
                element={
                  <RequireAuth>
                    <RequireRole roles={["superadmin", "admin", "manager", "user"]}>
                      <MyLibraryLayout>
                        <UserLibraryPage view="favorites" />
                      </MyLibraryLayout>
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="/users/my-library/department"
                element={
                  <RequireAuth>
                    <RequireRole roles={["superadmin", "admin", "manager", "user"]}>
                      <MyLibraryLayout>
                        <UserLibraryPage view="department" />
                      </MyLibraryLayout>
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="/users/:id"
                element={
                  <RequireAuth>
                    <RequireRole roles={["superadmin", "admin", "manager", "user"]}>
                      <UserLayout>
                        <UserFileDetailsPage />
                      </UserLayout>
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="/users/settings"
                element={
                  <RequireAuth>
                    <RequireRole roles={["superadmin", "admin", "manager", "user"]}>
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
