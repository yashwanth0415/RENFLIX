// src/app/routes.ts
import { createBrowserRouter } from "react-router";
import AppShell from "../components/layout/AppShell";

// Public pages
import LandingPage from "../features/landing/LandingPage";
import LoginPage from "../features/auth/LoginPage";
import SignupPage from "../features/auth/SignupPage";
import OnboardingPage from "../features/auth/OnboardingPage";
import AuthCallback from "../features/auth/AuthCallback";

// Authenticated pages
import RoleDashboardPage from "../features/dashboard/RoleDashboardPage";
import PropertiesPage from "../features/properties/PropertiesPage";
import PropertyDetailPage from "../features/properties/PropertyDetailPage";
import UnitsPage from "../features/units/UnitsPage";
import TenantsPage from "../features/tenants/TenantsPage";
import TenantDetailPage from "../features/tenants/TenantDetailPage";
import LeasesPage from "../features/leases/LeasesPage";
import RolePaymentsPage from "../features/payments/RolePaymentsPage";
import MaintenancePage from "../features/maintenance/MaintenancePage";
import MessagesPage from "../features/messaging/MessagesPage";
import AnalyticsPage from "../features/analytics/AnalyticsPage";
import CommunityPage from "../features/community/CommunityPage";
import IntelligencePage from "../features/intelligence/IntelligencePage";
import SettingsPage from "../features/settings/SettingsPage";
import NotificationsPage from "../features/notifications/NotificationsPage";
import AdminPage from "../features/admin/AdminPage";

export const router = createBrowserRouter([
  // ─── Public routes ──────────────────────────────────────
  {
    path: "/",
    Component: LandingPage,
  },
  {
    path: "/login",
    Component: LoginPage,
  },
  {
    path: "/signup",
    Component: SignupPage,
  },
  {
    path: "/onboarding",
    Component: OnboardingPage,
  },
  {
    path: "/auth/callback",
    Component: AuthCallback,
  },
  // Admin panel - separate auth
  {
    path: "/admin",
    Component: AdminPage,
  },

  // ─── Authenticated routes ──────────────────────────────
  // Use Component instead of element to avoid JSX in .ts
  {
    Component: AppShell,   // <-- no angle brackets
    children: [
      { path: "dashboard", Component: RoleDashboardPage },
      { path: "properties", Component: PropertiesPage },
      { path: "properties/:propertyDisplayId", Component: PropertyDetailPage },
      { path: "units", Component: UnitsPage },
      { path: "tenants", Component: TenantsPage },
      { path: "tenants/:tenantDisplayId", Component: TenantDetailPage },
      { path: "leases", Component: LeasesPage },
      { path: "payments", Component: RolePaymentsPage },
      { path: "maintenance", Component: MaintenancePage },
      { path: "messages", Component: MessagesPage },
      { path: "notifications", Component: NotificationsPage },
      { path: "analytics", Component: AnalyticsPage },
      { path: "community", Component: CommunityPage },
      { path: "intelligence", Component: IntelligencePage },
      { path: "settings", Component: SettingsPage },
    ],
  },
]);