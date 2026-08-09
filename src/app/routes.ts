import { createBrowserRouter, redirect } from "react-router";

// Lazy imports for better performance
import AppShell from "../components/layout/AppShell";
import LoginPage from "../features/auth/LoginPage";
import SignupPage from "../features/auth/SignupPage";
import OnboardingPage from "../features/auth/OnboardingPage";
import DashboardPage from "../features/dashboard/DashboardPage";
import PropertiesPage from "../features/properties/PropertiesPage";
import UnitsPage from "../features/units/UnitsPage";
import TenantsPage from "../features/tenants/TenantsPage";
import LeasesPage from "../features/leases/LeasesPage";
import PaymentsPage from "../features/payments/PaymentsPage";
import MaintenancePage from "../features/maintenance/MaintenancePage";
import MessagesPage from "../features/messaging/MessagesPage";
import AnalyticsPage from "../features/analytics/AnalyticsPage";
import CommunityPage from "../features/community/CommunityPage";
import SettingsPage from "../features/settings/SettingsPage";
import IntelligencePage from "../features/intelligence/IntelligencePage";

export const router = createBrowserRouter([
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
    path: "/",
    Component: AppShell,
    children: [
      { index: true, loader: () => redirect("/dashboard") },
      { path: "dashboard", Component: DashboardPage },
      { path: "properties", Component: PropertiesPage },
      { path: "units", Component: UnitsPage },
      { path: "tenants", Component: TenantsPage },
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
