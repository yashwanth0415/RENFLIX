import { Navigate } from "react-router";
import DashboardPage from "./DashboardPage";
import TenantDashboardPage from "../tenant/TenantDashboardPage";
import { useAuth } from "../../hooks/useAuth";

export default function RoleDashboardPage() {
  const { profile, loading } = useAuth();
  if (loading) return null;
  if (profile?.role === "TENANT") return <TenantDashboardPage />;
  return <DashboardPage />;
}
