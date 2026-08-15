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
import DashboardPage from "../features/dashboard/DashboardPage";
import PropertiesPage from "../features/properties/PropertiesPage";
import PropertyDetailPage from "../features/properties/PropertyDetailPage";
import UnitsPage from "../features/units/UnitsPage";
import TenantsPage from "../features/tenants/TenantsPage";
import TenantDetailPage from "../features/tenants/TenantDetailPage";
import LeasesPage from "../features/leases/LeasesPage";
import PaymentsPage from "../features/payments/PaymentsPage";
import MaintenancePage from "../features/maintenance/MaintenancePage";
import MessagesPage from "../features/messaging/MessagesPage";
import AnalyticsPage from "../features/analytics/AnalyticsPage";
import CommunityPage from "../features/community/CommunityPage";
import IntelligencePage from "../features/intelligence/IntelligencePage";
import SettingsPage from "../features/settings/SettingsPage";

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

  // ─── Authenticated routes ──────────────────────────────
  // Use Component instead of element to avoid JSX in .ts
  {
    Component: AppShell,   // <-- no angle brackets
    children: [
      { path: "dashboard", Component: DashboardPage },
      { path: "properties", Component: PropertiesPage },
      { path: "properties/:propertyDisplayId", Component: PropertyDetailPage },
      { path: "units", Component: UnitsPage },
      { path: "tenants", Component: TenantsPage },
      { path: "tenants/:tenantDisplayId", Component: TenantDetailPage },
      { path: "leases", Component: LeasesPage },
      { path: "payments", Component: PaymentsPage },
      { path: "maintenance", Component: MaintenancePage },
      { path: "messages", Component: MessagesPage },
      { path: "analytics", Component: AnalyticsPage },
      { path: "community", Component: CommunityPage },
      { path: "intelligence", Component: IntelligencePage },
      { path: "settings", Component: SettingsPage },
    ],
  },
]);