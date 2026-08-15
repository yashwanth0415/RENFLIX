export type UserRole =
  | "OWNER"
  | "PROPERTY_MANAGER"
  | "TENANT"
  | "HOSTEL_MANAGER"
  | "TECHNICIAN"
  | "COMMUNITY_MANAGER"
  | "ADMIN";

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

export interface Portfolio {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export type PropertyType =
  | "HOUSE"
  | "APARTMENT"
  | "PG"
  | "HOSTEL"
  | "COLIVING"
  | "VILLA"
  | "GATED_COMMUNITY"
  | "COMMERCIAL"
  | "SHOP"
  | "OFFICE"
  | "WAREHOUSE"
  | "PLOT"
  | "LAND"
  | "MIXED";

export type PropertyStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";

export interface Property {
  id: string;
  organization_id: string;
  portfolio_id: string | null;
  name: string;
  property_type: PropertyType;
  description: string | null;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  image_url: string | null;
  status: PropertyStatus;
  property_display_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type UnitStatus = "AVAILABLE" | "OCCUPIED" | "MAINTENANCE" | "RESERVED" | "BLOCKED";

export interface Unit {
  id: string;
  property_id: string;
  building_id: string | null;
  floor_id: string | null;
  unit_number: string;
  unit_type: string | null;
  name: string | null;
  area: number | null;
  status: UnitStatus;
  monthly_rent: number;
  security_deposit: number | null;
  metadata: Record<string, unknown> | null;
  property_display_id: string | null;
  created_at: string;
  updated_at: string;
}

export type TenantStatus = "ACTIVE" | "INACTIVE" | "FORMER";

export interface Tenant {
  id: string;
  organization_id: string;
  profile_id: string | null;
  full_name: string;
  email: string | null;
  phone: string;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  status: TenantStatus;
  unit_id: string | null;
  move_in_date: string | null;
  move_out_date: string | null;
  tenant_display_id: string | null;
  created_at: string;
  updated_at: string;
}

export type LeaseStatus = "DRAFT" | "ACTIVE" | "EXPIRED" | "TERMINATED" | "RENEWED";

export interface Lease {
  id: string;
  organization_id: string;
  property_id: string;
  unit_id: string;
  tenant_id: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  security_deposit: number;
  notice_period_days: number;
  late_fee_percentage: number;
  payment_day: number;
  status: LeaseStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type PaymentStatus = "PENDING" | "PAID" | "PARTIALLY_PAID" | "OVERDUE" | "WAIVED" | "CANCELLED";
export type PaymentMethod = "UPI" | "CARD" | "BANK_TRANSFER" | "CASH" | "CHEQUE" | "OTHER";

export interface Payment {
  id: string;
  organization_id: string;
  lease_id: string | null;
  tenant_id: string;
  unit_id: string | null;
  property_id: string | null;
  amount: number;
  due_date: string | null;
  paid_date: string | null;
  payment_method: PaymentMethod | null;
  reference_number: string | null;
  notes: string | null;
  status: PaymentStatus;
  receipt_url: string | null;
  created_at: string;
}

export type MaintenanceStatus =
  | "SUBMITTED"
  | "REVIEWED"
  | "ASSIGNED"
  | "ACCEPTED"
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "WAITING_FOR_PARTS"
  | "COMPLETED"
  | "VERIFIED"
  | "CLOSED";

export type MaintenancePriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface MaintenanceRequest {
  id: string;
  organization_id: string;
  property_id: string;
  unit_id: string | null;
  tenant_id: string | null;
  title: string;
  description: string;
  category: string;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  assigned_to: string | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  scheduled_date: string | null;
  completed_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  organization_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardMetrics {
  total_properties: number;
  total_units: number;
  occupied_units: number;
  total_tenants: number;
  monthly_revenue: number;
  collected_this_month: number;
  pending_rent: number;
  overdue_rent: number;
  active_maintenance: number;
  urgent_maintenance: number;
  leases_expiring_soon: number;
}
