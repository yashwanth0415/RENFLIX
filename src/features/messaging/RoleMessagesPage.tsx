import { useAuth } from "../../hooks/useAuth";
import MessagesPage from "./MessagesPage";
import TenantMessagesPage from "./TenantMessagesPage";

export default function RoleMessagesPage() {
  const { profile, loading } = useAuth();
  if (loading) return null;
  return profile?.role === "TENANT" ? <TenantMessagesPage /> : <MessagesPage />;
}
