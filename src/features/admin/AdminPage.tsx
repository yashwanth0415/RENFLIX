import { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router";
import {
  LayoutDashboard,
  Building2,
  DoorOpen,
  Users,
  FileText,
  CreditCard,
  Wrench,
  MessageSquare,
  BarChart3,
  Users as UsersIcon,
  Shield,
  Database,
  Settings,
  Plus,
  Edit,
  Trash2,
  Search,
  RefreshCw,
  Eye,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Key,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Bell,
  Menu,
  X,
  CheckSquare,
  Square,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import ClientAdminPanel from "./ClientAdminPanel";
import {
  Button,
  Card,
  StatusBadge,
  PageHeader,
  EmptyState,
  Modal,
  Input,
  Select,
  Textarea,
  Toast,
  ScrollArea,
} from "../../components/ui";

// Admin-only email
const ADMIN_EMAIL = "thurpatiyashwanth@gmail.com";

// Type for column configuration
interface ColumnConfig {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "boolean" | "select" | "email";
  required?: boolean;
  options?: string[];
}

// Table configurations
const TABLE_CONFIGS: Record<string, { label: string; icon: any; columns: ColumnConfig[]; searchFields: string[] }> = {
  organizations: {
    label: "Organizations",
    icon: Building2,
    columns: [
      { key: "id", label: "ID", type: "text" },
      { key: "name", label: "Name", type: "text", required: true },
      { key: "owner_id", label: "Owner ID", type: "text" },
      { key: "created_at", label: "Created", type: "date" },
    ],
    searchFields: ["name"],
  },
profiles: {
  label: "Profiles",
  icon: UsersIcon,

  columns: [
    {
      key: "id",
      label: "ID",
      type: "text",
    },

    {
      key: "full_name",
      label: "Full Name",
      type: "text",
    },

    {
      key: "email",
      label: "Email",
      type: "email",
    },

    {
      key: "phone",
      label: "Phone",
      type: "text",
    },

    {
      key: "avatar_url",
      label: "Avatar",
      type: "text",
    },

    {
      key: "role",
      label: "Role",
      type: "select",
      options: [
        "OWNER",
        "PROPERTY_MANAGER",
        "TENANT",
        "HOSTEL_MANAGER",
        "TECHNICIAN",
        "COMMUNITY_MANAGER",
        "ADMIN",
        "CLIENT",
      ],
    },

    {
      key: "organization_id",
      label: "Org ID",
      type: "text",
    },

    {
      key: "created_at",
      label: "Created",
      type: "date",
    },
  ],

  searchFields: [
    "full_name",
    "email",
    "phone",
  ],
},
  properties: {
    label: "Properties",
    icon: Building2,
    columns: [
      { key: "id", label: "ID", type: "text" },
      { key: "property_display_id", label: "Display ID", type: "text" },
      { key: "name", label: "Name", type: "text", required: true },
      { key: "property_type", label: "Type", type: "select", options: ["HOUSE", "APARTMENT", "PG", "HOSTEL", "COLIVING", "VILLA", "GATED_COMMUNITY", "COMMERCIAL", "SHOP", "OFFICE", "WAREHOUSE", "PLOT", "LAND", "MIXED"], required: true },
      { key: "address", label: "Address", type: "text", required: true },
      { key: "city", label: "City", type: "text", required: true },
      { key: "state", label: "State", type: "text", required: true },
      { key: "country", label: "Country", type: "text", required: true },
      { key: "postal_code", label: "Postal Code", type: "text" },
      { key: "monthly_rent", label: "Monthly Rent", type: "number" },
      { key: "status", label: "Status", type: "select", options: ["ACTIVE", "INACTIVE", "ARCHIVED"], required: true },
      { key: "organization_id", label: "Org ID", type: "text" },
      { key: "created_at", label: "Created", type: "date" },
    ],
    searchFields: ["name", "city", "address", "property_display_id"],
  },
  units: {
    label: "Units",
    icon: DoorOpen,
    columns: [
      { key: "id", label: "ID", type: "text" },
      { key: "property_id", label: "Property ID", type: "text", required: true },
      { key: "unit_number", label: "Unit Number", type: "text", required: true },
      { key: "unit_type", label: "Type", type: "text" },
      { key: "name", label: "Name", type: "text" },
      { key: "area", label: "Area (sqft)", type: "number" },
      { key: "monthly_rent", label: "Monthly Rent", type: "number", required: true },
      { key: "security_deposit", label: "Deposit", type: "number" },
      { key: "status", label: "Status", type: "select", options: ["AVAILABLE", "OCCUPIED", "MAINTENANCE", "RESERVED", "BLOCKED"], required: true },
      { key: "organization_id", label: "Org ID", type: "text" },
      { key: "created_at", label: "Created", type: "date" },
    ],
    searchFields: ["unit_number", "name"],
  },
  tenants: {
    label: "Tenants",
    icon: Users,
    columns: [
      { key: "id", label: "ID", type: "text" },
      { key: "tenant_display_id", label: "Display ID", type: "text" },
      { key: "full_name", label: "Full Name", type: "text", required: true },
      { key: "email", label: "Email", type: "email" },
      { key: "phone", label: "Phone", type: "text", required: true },
      { key: "emergency_contact_name", label: "Emergency Contact", type: "text" },
      { key: "emergency_contact_phone", label: "Emergency Phone", type: "text" },
      { key: "status", label: "Status", type: "select", options: ["ACTIVE", "INACTIVE", "FORMER"], required: true },
      { key: "unit_id", label: "Unit ID", type: "text" },
      { key: "move_in_date", label: "Move In", type: "date" },
      { key: "organization_id", label: "Org ID", type: "text" },
      { key: "created_at", label: "Created", type: "date" },
    ],
    searchFields: ["full_name", "email", "phone", "tenant_display_id"],
  },
  leases: {
    label: "Leases",
    icon: FileText,
    columns: [
      { key: "id", label: "ID", type: "text" },
      { key: "property_id", label: "Property ID", type: "text", required: true },
      { key: "unit_id", label: "Unit ID", type: "text", required: true },
      { key: "tenant_id", label: "Tenant ID", type: "text", required: true },
      { key: "start_date", label: "Start Date", type: "date", required: true },
      { key: "end_date", label: "End Date", type: "date", required: true },
      { key: "monthly_rent", label: "Monthly Rent", type: "number", required: true },
      { key: "security_deposit", label: "Deposit", type: "number", required: true },
      { key: "status", label: "Status", type: "select", options: ["DRAFT", "ACTIVE", "EXPIRED", "TERMINATED", "RENEWED"], required: true },
      { key: "organization_id", label: "Org ID", type: "text" },
      { key: "created_at", label: "Created", type: "date" },
    ],
    searchFields: [],
  },
  payments: {
    label: "Payments",
    icon: CreditCard,
    columns: [
      { key: "id", label: "ID", type: "text" },
      { key: "payment_display_id", label: "Payment ID", type: "text" },
      { key: "tenant_id", label: "Tenant ID", type: "text", required: true },
      { key: "unit_id", label: "Unit ID", type: "text" },
      { key: "property_id", label: "Property ID", type: "text" },
      { key: "amount", label: "Amount", type: "number", required: true },
      { key: "due_date", label: "Due Date", type: "date" },
      { key: "paid_date", label: "Paid Date", type: "date" },
      { key: "payment_method", label: "Method", type: "select", options: ["UPI", "CARD", "BANK_TRANSFER", "CASH", "CHEQUE", "OTHER"] },
      { key: "status", label: "Status", type: "select", options: ["PENDING", "UNDER_REVIEW", "RECEIVED", "PAID", "PARTIALLY_PAID", "OVERDUE", "WAIVED", "CANCELLED"], required: true },
      { key: "organization_id", label: "Org ID", type: "text" },
      { key: "submission_screenshot_url", label: "Payment Screenshot", type: "text" },
      { key: "created_at", label: "Created", type: "date" },
    ],
    searchFields: [],
  },
  maintenance_requests: {
    label: "Maintenance",
    icon: Wrench,
    columns: [
      { key: "id", label: "ID", type: "text" },
      { key: "property_id", label: "Property ID", type: "text", required: true },
      { key: "unit_id", label: "Unit ID", type: "text" },
      { key: "tenant_id", label: "Tenant ID", type: "text" },
      { key: "title", label: "Title", type: "text", required: true },
      { key: "description", label: "Description", type: "text" },
      { key: "category", label: "Category", type: "text" },
      { key: "priority", label: "Priority", type: "select", options: ["LOW", "MEDIUM", "HIGH", "URGENT"], required: true },
      { key: "status", label: "Status", type: "select", options: ["SUBMITTED", "REVIEWED", "ASSIGNED", "ACCEPTED", "SCHEDULED", "IN_PROGRESS", "WAITING_FOR_PARTS", "COMPLETED", "VERIFIED", "CLOSED"], required: true },
      { key: "organization_id", label: "Org ID", type: "text" },
      { key: "created_at", label: "Created", type: "date" },
    ],
    searchFields: ["title", "category"],
  },
  conversations: {
    label: "Conversations",
    icon: MessageSquare,
    columns: [
      { key: "id", label: "ID", type: "text" },
      { key: "title", label: "Title", type: "text" },
      { key: "organization_id", label: "Org ID", type: "text" },
      { key: "created_at", label: "Created", type: "date" },
    ],
    searchFields: ["title"],
  },
  community_announcements: {
    label: "Announcements",
    icon: BarChart3,
    columns: [
      { key: "id", label: "ID", type: "text" },
      { key: "title", label: "Title", type: "text", required: true },
      { key: "body", label: "Body", type: "text", required: true },
      { key: "priority", label: "Priority", type: "select", options: ["NORMAL", "IMPORTANT", "URGENT"], required: true },
      { key: "organization_id", label: "Org ID", type: "text" },
      { key: "created_at", label: "Created", type: "date" },
    ],
    searchFields: ["title"],
  },
  notifications: {
    label: "Notifications",
    icon: Bell,
    columns: [
      { key: "id", label: "ID", type: "text" },
      { key: "user_id", label: "User ID", type: "text" },
      { key: "type", label: "Type", type: "text" },
      { key: "title", label: "Title", type: "text" },
      { key: "message", label: "Message", type: "text" },
      { key: "read", label: "Read", type: "boolean" },
      { key: "entity_type", label: "Entity Type", type: "text" },
      { key: "entity_id", label: "Entity ID", type: "text" },
      { key: "created_at", label: "Created", type: "date" },
    ],
    searchFields: ["title", "message"],
  },
};

type TableKey = keyof typeof TABLE_CONFIGS;

export default function AdminPage() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const adminSection = new URLSearchParams(location.search).get("section");

  const [activeTable, setActiveTable] = useState<TableKey>("organizations");
  const [data, setData] = useState<any[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editRecord, setEditRecord] = useState<any | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ message: string; resolve: (value: boolean) => void } | null>(null);

  const tableConfig = TABLE_CONFIGS[activeTable];
  const filteredData = data.filter((row) => {
    if (!search.trim() || tableConfig.searchFields.length === 0) return true;
    return tableConfig.searchFields.some((field) =>
      row[field]?.toString().toLowerCase().includes(search.toLowerCase())
    );
  });

  // Initialize auth modal state based on auth status
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        setShowAuthModal(true);
      } else if (user.email !== ADMIN_EMAIL) {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [user, authLoading, navigate]);

  // Fetch data when table changes
  useEffect(() => {
    if (user && user.email === ADMIN_EMAIL) {
      fetchData();
    }
  }, [activeTable, page, user]);

  // Add a timeout to prevent infinite loading
  useEffect(() => {
    const timer = setTimeout(() => {
      if (authLoading) {
        console.warn("Auth loading timeout - forcing auth check");
        // Force a re-check of auth state
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user) {
            // Force a re-render by triggering auth state refresh
            window.location.reload();
          }
        });
      }
    }, 10000); // 10 second timeout
    return () => clearTimeout(timer);
  }, [authLoading]);

  async function fetchData() {
    setLoading(true);
    try {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase.from(activeTable).select("*", { count: "exact" });

      // Add search filter
      if (search && tableConfig.searchFields.length > 0) {
        const orConditions = tableConfig.searchFields.map((f) => `${f}.ilike.%${search}%`).join(",");
        query = query.or(orConditions);
      }

      query = query.range(from, to).order("created_at", { ascending: false });

      const { data: result, error, count } = await query;

      if (error) throw error;

      setData(result || []);
      setTotalCount(count || 0);
    } catch (err: any) {
      setToast({ msg: err.message || "Failed to fetch data", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  function openAdd() {
    setEditRecord(null);
    // Initialize form with default values
    const defaults: Record<string, any> = {};
    tableConfig.columns.forEach((col) => {
      if (col.required) {
        if (col.type === "select" && col.options) {
          defaults[col.key] = col.options[0];
        } else if (col.type === "boolean") {
          defaults[col.key] = false;
        } else if (col.type === "number") {
          defaults[col.key] = 0;
        } else {
          defaults[col.key] = "";
        }
      }
    });
    setFormData(defaults);
    setShowModal(true);
  }

  function openEdit(record: any) {
    setEditRecord(record);
    setFormData({ ...record });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Clean form data
      const payload: Record<string, any> = {};
      Object.entries(formData).forEach(([key, value]) => {
        if (value === "" || value === null) {
          payload[key] = null;
        } else if (typeof value === "string" && !isNaN(Number(value)) && tableConfig.columns.find(c => c.key === key)?.type === "number") {
          payload[key] = Number(value);
        } else {
          payload[key] = value;
        }
      });

      if (editRecord) {
        payload.updated_at = new Date().toISOString();
        const { error } = await supabase.from(activeTable).update(payload).eq("id", editRecord.id);
        if (error) throw error;
        setToast({ msg: `${tableConfig.label} updated!`, type: "success" });
      } else {
        payload.created_at = new Date().toISOString();
        payload.updated_at = new Date().toISOString();
        const { error } = await supabase.from(activeTable).insert(payload);
        if (error) throw error;
        setToast({ msg: `${tableConfig.label} added!`, type: "success" });
      }

      setShowModal(false);
      fetchData();
    } catch (err: any) {
      setToast({ msg: err.message || "Operation failed", type: "error" });
    } finally {
      setSubmitting(false);
    }
  }


  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setAuthSubmitting(true);

    try {
      const { error, data } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword,
      });

      if (error) throw error;

      // Check if the logged-in user is the admin
      if (data.user?.email !== ADMIN_EMAIL) {
        await supabase.auth.signOut();
        setToast({ msg: "Access denied. Admin only.", type: "error" });
        return;
      }

      setShowAuthModal(false);
      setToast({ msg: "Admin access granted!", type: "success" });
    } catch (err: any) {
      setToast({ msg: err.message || "Authentication failed", type: "error" });
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  }

  const totalPages = Math.ceil(totalCount / pageSize);

  // Show loading state while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <div className="text-white font-display text-xl">Loading Admin Panel...</div>
          <div className="text-navy-400 text-sm">Initializing authentication...</div>
        </div>
      </div>
    );
  }

  // Show auth modal if user needs to authenticate
  if (showAuthModal) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <div className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                <Key size={24} className="text-white" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold text-white">Admin Access</h2>
                <p className="text-navy-400 text-sm">Enter admin credentials</p>
              </div>
            </div>
            <form onSubmit={handleAuth} className="flex flex-col gap-4">
              <Input
                label="Email"
                type="email"
                placeholder=""
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                required
                autoComplete="email"
              />
              <Input
                label="Password"
                type="password"
                placeholder=""
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <Button type="submit" className="w-full" loading={authSubmitting}>
                <Key size={16} className="mr-2" /> Access Admin Panel
              </Button>
            </form>
            {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
            {/*<p className="text-center text-xs text-navy-500 mt-4">
              Default: thurpatiyashwanth@gmail.com / Yash@1234
            </p>*/}
          </div>
        </Card>
      </div>
    );
  }

  // Redirect non-admin users
  if (!user || user.email !== ADMIN_EMAIL) {
    return null;
  }

  if (adminSection === "clients") {
    return <ClientAdminPanel />;
  }

  // Show loading while data is fetching
  if (loading) {
    return (
      <div className="h-screen bg-navy-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <div className="text-white font-display text-xl">Loading {TABLE_CONFIGS[activeTable].label}...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-navy-900 flex overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-navy-950/85 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside className={`w-64 bg-navy-950 border-r border-navy-800 flex flex-col ${mobileSidebarOpen ? 'fixed inset-y-0 left-0 z-50 lg:static lg:z-auto' : 'hidden lg:block'}`}>
        <div className="p-5 border-b border-navy-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
              <Shield size={20} className="text-white" />
            </div>
            <div>
              <h1 className="font-display font-bold text-white">Admin Panel</h1>
              <p className="text-[10px] text-blue-400 font-mono">thurpatiyashwanth@gmail.com</p>
            </div>
          </div>
          {/* Mobile close button */}
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-navy-700 text-navy-300 hover:text-white transition-colors"
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 p-3 overflow-y-auto">
          <button
            onClick={() => { setMobileSidebarOpen(false); navigate("/admin?section=clients"); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-blue-300 hover:bg-blue-500/10 mb-2 border border-blue-500/15"
          >
            <Users size={18} />
            <span className="truncate">Clients</span>
          </button>
          {Object.entries(TABLE_CONFIGS).map(([key, config]) => (
            <button
              key={key}
              onClick={() => { setActiveTable(key as TableKey); setPage(1); setSearch(""); setMobileSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTable === key
                  ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                  : "text-navy-300 hover:bg-navy-800 hover:text-white"
              }`}
            >
              <config.icon size={18} />
              <span className="truncate">{config.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-navy-800">
          <Button variant="ghost" size="sm" className="w-full" onClick={handleSignOut}>
            <LogOut size={16} className="mr-2" /> Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        {/* Mobile header with hamburger menu */}
        <header className="lg:hidden mb-6 flex items-center justify-between">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-navy-700 text-navy-300 transition-colors active:scale-90"
            aria-label="Open sidebar"
          >
            <Menu size={24} />
          </button>
          <div className="font-display font-extrabold gradient-text text-lg">RENFLIX</div>
          <div className="w-10" /> {/* spacer for alignment */}
        </header>
        <div className="max-w-[1600px] mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="font-display text-2xl font-bold text-white">{tableConfig.label}</h1>
              <p className="text-navy-400 text-sm mt-1">Manage {tableConfig.label.toLowerCase()} - {totalCount} records</p>
            </div>
            <div className="flex items-center gap-2">
              {selectionMode ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleDeleteSelected}
                  className="text-red-400 hover:text-red-300"
                  disabled={selectedIds.length === 0}
                >
                  <Trash2 size={14} className="mr-1" /> Delete{selectedIds.length ? ` (${selectedIds.length})` : ""}
                </Button>
              ) : (
                <Button variant="secondary" size="sm" onClick={() => setSelectionMode(true)}>
                  <CheckSquare size={14} className="mr-1" /> Select
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={fetchData}>
                <RefreshCw size={14} className="mr-1" /> Refresh
              </Button>
              <Button onClick={openAdd}>
                <Plus size={14} className="mr-1" /> Add {tableConfig.label.slice(0, -1)}
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-500" />
            <input
              className="w-full max-w-md bg-navy-800 border border-navy-700 rounded-lg pl-9 pr-4 py-2.5 text-sm text-navy-100 placeholder-navy-500 focus:outline-none focus:ring-2 focus:ring-blue-electric"
              placeholder="Search..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          {/* Table */}
          <Card className="overflow-hidden">
            {filteredData.length === 0 ? (
              <EmptyState
                icon={<tableConfig.icon size={28} />}
                title="No records found"
                description={search ? "Try adjusting your search" : `No ${tableConfig.label.toLowerCase()} yet`}
                action={!search ? <Button onClick={openAdd} size="sm"><Plus size={14} /> Add {tableConfig.label.slice(0, -1)}</Button> : undefined}
              />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-navy-700 bg-navy-950/50">
                        {selectionMode && (
                          <th className="w-12 px-3 py-3">
                            <button type="button" onClick={toggleAllVisible} className="text-navy-300">
                              {filteredData.length > 0 && filteredData.every(row => selectedIds.includes(row.id))
                                ? <CheckSquare size={17} />
                                : <Square size={17} />}
                            </button>
                          </th>
                        )}
                        {tableConfig.columns.slice(0, 6).map((col) => (
                          <th key={col.key} className="text-left px-4 py-3 text-xs font-semibold text-navy-400 font-display uppercase tracking-wider">
                            {col.label}
                          </th>
                        ))}
                        <th className="text-right px-4 py-3 text-xs font-semibold text-navy-400 font-display uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.map((row) => (
                        <tr key={row.id} className="border-b border-navy-700/50 hover:bg-navy-700/30 transition-colors">
                          {selectionMode && (
                            <td className="w-12 px-3 py-3">
                              <button type="button" onClick={() => toggleSelected(row.id)} className="text-navy-300">
                                {selectedIds.includes(row.id) ? <CheckSquare size={17} /> : <Square size={17} />}
                              </button>
                            </td>
                          )}
                          {tableConfig.columns.slice(0, 6).map((col) => (
                            <td key={col.key} className="px-4 py-3">
                              {col.type === "boolean" ? (
                                <StatusBadge status={row[col.key] ? "ACTIVE" : "INACTIVE"} />
                              ) : col.type === "date" ? (
                                <span className="text-navy-300">{row[col.key] ? new Date(row[col.key]).toLocaleDateString("en-IN") : "—"}</span>
                              ) : (
                                <span className="text-navy-300 truncate block max-w-[150px]">{row[col.key] || "—"}</span>
                              )}
                            </td>
                          ))}
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
                                <Edit size={14} />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleSingleDelete(row.id)} className="text-red-400 hover:text-red-300">
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between p-4 border-t border-navy-700">
                    <div className="text-sm text-navy-400">
                      Page {page} of {totalPages} • {totalCount} total
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                        <ChevronLeft size={14} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                        <ChevronRight size={14} />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>

          {/* Add/Edit Modal */}
          <Modal
            open={showModal}
            onClose={() => setShowModal(false)}
            title={editRecord ? `Edit ${tableConfig.label.slice(0, -1)}` : `Add ${tableConfig.label.slice(0, -1)}`}
            width="max-w-2xl"
          >
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
              {tableConfig.columns.map((col) => (
                col.type !== "date" || col.key !== "created_at" && col.key !== "updated_at" ? (
                  <div key={col.key} className={col.type === "text" && col.key?.includes("description") ? "grid grid-cols-1" : "grid grid-cols-2 gap-3"}>
                    {col.type === "select" ? (
                      <Select
                        label={col.label}
                        value={formData[col.key] || ""}
                        onChange={(e) => setFormData(f => ({ ...f, [col.key]: e.target.value }))}
                        options={col.options!.map((o) => ({ value: o, label: o }))}
                        required={col.required}
                      />
                    ) : col.type === "boolean" ? (
                      <Select
                        label={col.label}
                        value={formData[col.key] ? "true" : "false"}
                        onChange={(e) => setFormData(f => ({ ...f, [col.key]: e.target.value === "true" }))}
                        options={[{ value: "true", label: "Yes" }, { value: "false", label: "No" }]}
                        required={col.required}
                      />
                    ) : col.type === "date" ? (
                      <Input
                        label={col.label}
                        type="date"
                        value={formData[col.key] || ""}
                        onChange={(e) => setFormData(f => ({ ...f, [col.key]: e.target.value }))}
                        required={col.required}
                      />
                    ) : col.type === "number" ? (
                      <Input
                        label={col.label}
                        type="number"
                        placeholder={col.label}
                        value={formData[col.key] !== undefined && formData[col.key] !== null ? String(formData[col.key]) : ""}
                        onChange={(e) => setFormData(f => ({ ...f, [col.key]: e.target.value }))}
                        required={col.required}
                      />
                    ) : col.type === "email" ? (
                      <Input
                        label={col.label}
                        type="email"
                        placeholder={col.label}
                        value={formData[col.key] || ""}
                        onChange={(e) => setFormData(f => ({ ...f, [col.key]: e.target.value }))}
                        required={col.required}
                      />
                    ) : (
                      <Input
                        label={col.label}
                        placeholder={col.label}
                        value={formData[col.key] || ""}
                        onChange={(e) => setFormData(f => ({ ...f, [col.key]: e.target.value }))}
                        required={col.required}
                      />
                    )}
                  </div>
                ) : null
              ))}
              <div className="flex gap-2 justify-end pt-2 border-t border-navy-700 mt-4">
                <Button variant="ghost" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button type="submit" loading={submitting}>
                  {editRecord ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </Modal>

          {deleteConfirm && (
            <div
              className="fixed inset-0 z-[2147483647] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
              role="dialog"
              aria-modal="true"
              aria-labelledby="admin-delete-confirm-title"
              onClick={(e) => {
                if (e.target === e.currentTarget) closeDeleteConfirmation(false);
              }}
            >
              <div className="w-full max-w-md rounded-2xl border border-navy-700 bg-navy-950 shadow-2xl p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-400/20 flex items-center justify-center text-red-400 shrink-0">
                    <AlertTriangle size={18} />
                  </div>
                  <div className="min-w-0">
                    <h3 id="admin-delete-confirm-title" className="font-display font-bold text-white text-lg">Confirm deletion</h3>
                    <p className="text-sm text-navy-400 mt-1 leading-6">{deleteConfirm.message}</p>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <Button variant="ghost" type="button" onClick={() => closeDeleteConfirmation(false)}>Cancel</Button>
                  <button type="button" className="inline-flex items-center justify-center rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600 transition-colors" onClick={() => closeDeleteConfirmation(true)}>
                    <Trash2 size={14} className="mr-2" /> Delete
                  </button>
                </div>
              </div>
            </div>
          )}

          {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
        </div>
      </main>
    </div>
  );
  function toggleSelected(id: string) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function toggleAllVisible() {
    const ids = filteredData.map(row => row.id);
    const allSelected = ids.length > 0 && ids.every(id => selectedIds.includes(id));
    setSelectedIds(allSelected ? [] : Array.from(new Set([...selectedIds, ...ids])));
  }

  function requestDeleteConfirmation(message: string): Promise<boolean> {
    return new Promise((resolve) => {
      setDeleteConfirm({ message, resolve });
    });
  }

  function closeDeleteConfirmation(value: boolean) {
    const request = deleteConfirm;
    setDeleteConfirm(null);
    request?.resolve(value);
  }

  async function handleDeleteSelected() {
    if (!selectedIds.length) {
      setToast({ msg: "Select at least one entry.", type: "error" });
      return;
    }

    if (activeTable === "profiles") {
      // Never allow the currently signed-in admin profile to be deleted.
      if (user?.id && selectedIds.includes(user.id)) {
        setToast({
          msg: "The currently signed-in admin profile cannot be deleted.",
          type: "error",
        });
        return;
      }
    }

    const confirmed = await requestDeleteConfirmation(
      `Delete ${selectedIds.length} selected ${tableConfig.label.toLowerCase()}? This permanently removes the database records.`
    );

    if (!confirmed) return;

    try {
      let deletedCount = selectedIds.length;

      if (activeTable === "profiles") {
        const { data, error } = await supabase.functions.invoke(
          "admin-delete-profile",
          { body: { profileIds: selectedIds } }
        );

        if (error) {
          let message = error.message || "Profile deletion failed.";
          try {
            if (error.context) {
              const response = await error.context.json();
              if (response?.error) message = response.error;
            }
          } catch {
            // Keep fallback message.
          }
          throw new Error(message);
        }

        if (data?.error) throw new Error(data.error);
        deletedCount = Number(data?.deletedCount ?? selectedIds.length);
      } else {
        const { data, error } = await supabase.rpc(
          "admin_delete_records",
          {
            p_table: activeTable,
            p_ids: selectedIds,
          }
        );

        if (error) throw error;
        deletedCount =
          typeof data === "number"
            ? data
            : selectedIds.length;
      }

      setToast({
        msg: `${deletedCount} record(s) deleted successfully.`,
        type: "success",
      });

      setSelectedIds([]);
      setSelectionMode(false);
      await fetchData();
    } catch (err: any) {
      console.error("Delete failed:", err);
      setToast({
        msg: err?.message || "Delete failed. Please try again.",
        type: "error",
      });
    }
  }

  async function handleSingleDelete(id: string) {
    if (activeTable === "profiles" && user?.id === id) {
      setToast({
        msg: "The currently signed-in admin profile cannot be deleted.",
        type: "error",
      });
      return;
    }

    const confirmed = await requestDeleteConfirmation(
      `Delete this ${tableConfig.label.slice(0, -1).toLowerCase()}? This permanently removes the database record.`
    );

    if (!confirmed) return;

    try {
      let deletedCount = 1;

      if (activeTable === "profiles") {
        const { data, error } = await supabase.functions.invoke(
          "admin-delete-profile",
          { body: { profileIds: [id] } }
        );

        if (error) {
          let message = error.message || "Profile deletion failed.";
          try {
            if (error.context) {
              const response = await error.context.json();
              if (response?.error) message = response.error;
            }
          } catch {
            // Keep fallback message.
          }
          throw new Error(message);
        }

        if (data?.error) throw new Error(data.error);
        deletedCount = Number(data?.deletedCount ?? 1);
      } else {
        const { data, error } = await supabase.rpc(
          "admin_delete_records",
          {
            p_table: activeTable,
            p_ids: [id],
          }
        );

        if (error) throw error;
        deletedCount =
          typeof data === "number" ? data : 1;
      }

      setToast({
        msg: `${deletedCount} record(s) deleted successfully.`,
        type: "success",
      });

      setSelectedIds((prev) =>
        prev.filter((selectedId) => selectedId !== id)
      );
      setSelectionMode(false);
      await fetchData();
    } catch (err: any) {
      console.error("Delete failed:", err);
      setToast({
        msg: err?.message || "Delete failed. Please try again.",
        type: "error",
      });
    }
  }
}
