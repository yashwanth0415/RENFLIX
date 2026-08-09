import React from "react";

// ── Button ──────────────────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading,
  children,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 font-display font-semibold rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-navy-900 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary: "btn-primary focus:ring-blue-500",
    secondary:
      "bg-navy-700 text-navy-100 hover:bg-navy-600 border border-navy-600 focus:ring-navy-500",
    ghost:
      "text-navy-300 hover:text-white hover:bg-navy-700 focus:ring-navy-500",
    danger: "bg-red-600 text-white hover:bg-red-500 focus:ring-red-500",
  };

  const sizes = {
    sm: "text-xs px-3 py-1.5",
    md: "text-sm px-4 py-2",
    lg: "text-base px-6 py-3",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}

// ── Input ───────────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, className = "", id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold text-navy-300 font-display uppercase tracking-wider"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full bg-navy-800 border ${error ? "border-red-500" : "border-navy-600"} rounded-lg px-3 py-2.5 text-sm text-navy-100 placeholder-navy-500 focus:outline-none focus:ring-2 focus:ring-blue-electric focus:border-transparent transition-all ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      {hint && !error && <p className="text-xs text-navy-500">{hint}</p>}
    </div>
  );
}

// ── Select ──────────────────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, error, options, className = "", id, ...props }: SelectProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold text-navy-300 font-display uppercase tracking-wider"
        >
          {label}
        </label>
      )}
      <select
        id={inputId}
        className={`w-full bg-navy-800 border ${error ? "border-red-500" : "border-navy-600"} rounded-lg px-3 py-2.5 text-sm text-navy-100 focus:outline-none focus:ring-2 focus:ring-blue-electric focus:border-transparent transition-all appearance-none ${className}`}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

// ── Textarea ─────────────────────────────────────────────────────────────────
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className = "", id, ...props }: TextareaProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold text-navy-300 font-display uppercase tracking-wider"
        >
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={`w-full bg-navy-800 border ${error ? "border-red-500" : "border-navy-600"} rounded-lg px-3 py-2.5 text-sm text-navy-100 placeholder-navy-500 focus:outline-none focus:ring-2 focus:ring-blue-electric focus:border-transparent transition-all resize-y min-h-[80px] ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

// ── Card ────────────────────────────────────────────────────────────────────
interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function Card({ children, className = "", hover, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-navy-800 border border-navy-700 rounded-xl p-5 ${hover ? "card-hover cursor-pointer" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

// ── Badge / Status Pill ──────────────────────────────────────────────────────
const statusColors: Record<string, string> = {
  ACTIVE: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  AVAILABLE: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  PAID: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  COMPLETED: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  CLOSED: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  VERIFIED: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",

  OCCUPIED: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  ASSIGNED: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  IN_PROGRESS: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  ACCEPTED: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  RENEWED: "bg-blue-500/15 text-blue-400 border-blue-500/30",

  PENDING: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  SUBMITTED: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  REVIEWED: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  SCHEDULED: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  DRAFT: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  RESERVED: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  WAITING_FOR_PARTS: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  PARTIALLY_PAID: "bg-amber-500/15 text-amber-400 border-amber-500/30",

  OVERDUE: "bg-red-500/15 text-red-400 border-red-500/30",
  URGENT: "bg-red-500/15 text-red-400 border-red-500/30",
  EXPIRED: "bg-red-500/15 text-red-400 border-red-500/30",
  TERMINATED: "bg-red-500/15 text-red-400 border-red-500/30",

  MAINTENANCE: "bg-orange-500/15 text-orange-400 border-orange-500/30",

  INACTIVE: "bg-navy-600/40 text-navy-400 border-navy-600",
  ARCHIVED: "bg-navy-600/40 text-navy-400 border-navy-600",
  CANCELLED: "bg-navy-600/40 text-navy-400 border-navy-600",
  FORMER: "bg-navy-600/40 text-navy-400 border-navy-600",
  BLOCKED: "bg-navy-600/40 text-navy-400 border-navy-600",

  HIGH: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  MEDIUM: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  LOW: "bg-navy-600/40 text-navy-400 border-navy-600",
};

export function StatusBadge({ status }: { status: string }) {
  const color = statusColors[status] || "bg-navy-600/40 text-navy-400 border-navy-600";
  return (
    <span
      className={`status-pill border ${color}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bg-navy-700 rounded-lg animate-pulse ${className}`}
    />
  );
}

// ── Modal ────────────────────────────────────────────────────────────────────
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
}

export function Modal({ open, onClose, title, children, width = "max-w-lg" }: ModalProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-navy-950/80 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative bg-navy-800 border border-navy-700 rounded-2xl shadow-2xl w-full ${width} animate-fade-in max-h-[90vh] overflow-y-auto`}
      >
        <div className="flex items-center justify-between p-5 border-b border-navy-700">
          <h2 className="font-display text-lg font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-navy-400 hover:text-white p-1.5 rounded-lg hover:bg-navy-700 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ── Empty State ──────────────────────────────────────────────────────────────
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-navy-700 flex items-center justify-center mb-4 text-navy-400">
        {icon}
      </div>
      <h3 className="font-display text-base font-bold text-navy-200 mb-1">{title}</h3>
      {description && <p className="text-sm text-navy-500 max-w-xs mb-4">{description}</p>}
      {action}
    </div>
  );
}

// ── Stat Card ────────────────────────────────────────────────────────────────
export function StatCard({
  label,
  value,
  sub,
  color = "blue",
  icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: "blue" | "emerald" | "amber" | "red" | "violet" | "orange";
  icon: React.ReactNode;
}) {
  const colors = {
    blue: "from-blue-600/20 to-blue-800/10 border-blue-600/20 text-blue-400",
    emerald: "from-emerald-600/20 to-emerald-800/10 border-emerald-600/20 text-emerald-400",
    amber: "from-amber-600/20 to-amber-800/10 border-amber-600/20 text-amber-400",
    red: "from-red-600/20 to-red-800/10 border-red-600/20 text-red-400",
    violet: "from-violet-600/20 to-violet-800/10 border-violet-600/20 text-violet-400",
    orange: "from-orange-600/20 to-orange-800/10 border-orange-600/20 text-orange-400",
  };
  return (
    <div
      className={`relative bg-gradient-to-br ${colors[color]} border rounded-xl p-5 overflow-hidden`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-lg bg-navy-800/60 flex items-center justify-center">
          {icon}
        </div>
      </div>
      <div className="font-display text-2xl font-bold text-white mb-0.5">{value}</div>
      <div className="text-xs font-semibold text-navy-300 font-display uppercase tracking-wider">{label}</div>
      {sub && <div className="text-xs text-navy-500 mt-1">{sub}</div>}
    </div>
  );
}

// ── Toast ────────────────────────────────────────────────────────────────────
interface ToastProps {
  message: string;
  type?: "success" | "error" | "info";
  onClose: () => void;
}

export function Toast({ message, type = "info", onClose }: ToastProps) {
  const colors = {
    success: "bg-emerald-600 border-emerald-500",
    error: "bg-red-700 border-red-600",
    info: "bg-blue-700 border-blue-600",
  };
  React.useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className={`fixed bottom-4 right-4 z-[100] flex items-center gap-3 ${colors[type]} border text-white text-sm font-medium px-4 py-3 rounded-xl shadow-2xl animate-fade-in max-w-sm`}
    >
      {message}
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">✕</button>
    </div>
  );
}

// ── Page Header ──────────────────────────────────────────────────────────────
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">{title}</h1>
        {subtitle && <p className="text-sm text-navy-400 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
