import { Navigate } from "react-router";
import PaymentsPage from "./PaymentsPage";
import TenantPaymentsPage from "../tenant/TenantPaymentsPage";
import { useAuth } from "../../hooks/useAuth";
export default function RolePaymentsPage() { const { profile, loading } = useAuth(); if (loading) return null; if (profile?.role === "TENANT") return <TenantPaymentsPage />; return <PaymentsPage />; }
