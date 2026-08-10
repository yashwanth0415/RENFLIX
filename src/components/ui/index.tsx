import React, { useEffect, useRef } from "react";
import { X, Loader2 } from "lucide-react";

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
  onClick,
  ...props
}: ButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    // Ripple effect
    const btn = ref.current;
    if (btn) {
      const rect = btn.getBoundingClientRect();
      const ripple = document.createElement("span");
      ripple.className = "ripple-circle";
      ripple.style.left = `${e.clientX - rect.left}px`;
      ripple.style.top = `${e.clientY - rect.top}px`;
      btn.appendChild(ripple);
      setTimeout(() => ripple.remove(), 650);
    }
    onClick?.(e);
  }

  const base =
    "ripple inline-flex items-center justify-center gap-2 font-display font-semibold rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-navy-900 disabled:opacity-50 disabled:cursor-not-allowed select-none";

  const variants = {
    primary: "btn-primary focus:ring-blue-500",
    secondary:
      "bg-navy-700 text-navy-100 hover:bg-navy-600 border border-navy-600 hover:border-navy-500 focus:ring-navy-500 active:scale-95 transition-all",
    ghost:
      "text-navy-300 hover:text-white hover:bg-navy-700/60 focus:ring-navy-500 active:scale-95",
    danger:
      "bg-red-600 text-white hover:bg-red-500 focus:ring-red-500 active:scale-95 shadow-lg shadow-red-900/20",
  };

  const sizes = {
    sm: "text-xs px-3 py-1.5",
    md: "text-sm px-4 py-2",
    lg: "text-base px-6 py-3",
  };

  return (
    <button
      ref={ref}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      onClick={handleClick}
      {...props}
    >
      {loading && <Loader2 size={14} className="animate-spin flex-shrink-0" />}
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
        className={`w-full bg-navy-800/80 border ${error ? "border-red-500 focus:ring-red-500" : "border-navy-600 focus:ring-blue-electric"} rounded-lg px-3 py-2.5 text-sm text-navy-100 placeholder-navy-500 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-150 ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-400 animate-fade-in-fast">{error}</p>}
      {hint && !error && <p className="text-xs text-navy-600">{hint}</p>}
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
        className={`w-full bg-navy-800/80 border ${error ? "border-red-500" : "border-navy-600"} rounded-lg px-3 py-2.5 text-sm text-navy-100 focus:outline-none focus:ring-2 focus:ring-blue-electric focus:border-transparent transition-all appearance-none cursor-pointer ${className}`}
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-navy-800">{o.label}</option>
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
        className={`w-full bg-navy-800/80 border ${error ? "border-red-500" : "border-navy-600"} rounded-lg px-3 py-2.5 text-sm text-navy-100 placeholder-navy-500 focus:outline-none focus:ring-2 focus:ring-blue-electric focus:border-transparent transition-all resize-y min-h-[80px] ${className}`}
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
      className={`bg-navy-800 border border-navy-700 rounded-xl p-5 transition-all duration-200 ${hover ? "card-hover cursor-pointer" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

// ── Status Badge ─────────────────────────────────────────────────────────────
const statusColors: Record<string, string> = {
  ACTIVE:            "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  AVAILABLE:         "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  PAID:              "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  COMPLETED:         "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  CLOSED:            "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  VERIFIED:          "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",

  OCCUPIED:          "bg-blue-500/15 text-blue-400 border-blue-500/30",
  ASSIGNED:          "bg-blue-500/15 text-blue-400 border-blue-500/30",
  IN_PROGRESS:       "bg-blue-500/15 text-blue-400 border-blue-500/30",
  ACCEPTED:          "bg-blue-500/15 text-blue-400 border-blue-500/30",
  RENEWED:           "bg-blue-500/15 text-blue-400 border-blue-500/30",

  PENDING:           "bg-amber-500/15 text-amber-400 border-amber-500/30",
  SUBMITTED:         "bg-amber-500/15 text-amber-400 border-amber-500/30",
  REVIEWED:          "bg-amber-500/15 text-amber-400 border-amber-500/30",
  SCHEDULED:         "bg-amber-500/15 text-amber-400 border-amber-500/30",
  DRAFT:             "bg-amber-500/15 text-amber-400 border-amber-500/30",
  RESERVED:          "bg-amber-500/15 text-amber-400 border-amber-500/30",
  WAITING_FOR_PARTS: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  PARTIALLY_PAID:    "bg-amber-500/15 text-amber-400 border-amber-500/30",

  OVERDUE:           "bg-red-500/15 text-red-400 border-red-500/30",
  URGENT:            "bg-red-500/15 text-red-400 border-red-500/30",
  EXPIRED:           "bg-red-500/15 text-red-400 border-red-500/30",
  TERMINATED:        "bg-red-500/15 text-red-400 border-red-500/30",

  MAINTENANCE:       "bg-orange-500/15 text-orange-400 border-orange-500/30",
  HIGH:              "bg-orange-500/15 text-orange-400 border-orange-500/30",
  MEDIUM:            "bg-amber-500/15 text-amber-400 border-amber-500/30",
  LOW:               "bg-navy-600/40 text-navy-400 border-navy-600",

  INACTIVE:          "bg-navy-600/40 text-navy-400 border-navy-600",
  ARCHIVED:          "bg-navy-600/40 text-navy-400 border-navy-600",
  CANCELLED:         "bg-navy-600/40 text-navy-400 border-navy-600",
  FORMER:            "bg-navy-600/40 text-navy-400 border-navy-600",
  BLOCKED:           "bg-navy-600/40 text-navy-400 border-navy-600",
};

export function StatusBadge({ status }: { status: string }) {
  const color = statusColors[status] || "bg-navy-600/40 text-navy-400 border-navy-600";
  return (
    <span className={`status-pill border ${color}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-lg ${className}`} />;
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
  // ESC to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-navy-950/85 backdrop-blur-sm modal-backdrop"
        onClick={onClose}
      />
      <div
        className={`relative bg-navy-800 border border-navy-700 rounded-2xl shadow-2xl w-full ${width} modal-content max-h-[90vh] overflow-y-auto`}
        style={{ boxShadow: "0 25px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(59,130,246,0.1)" }}
      >
        <div className="flex items-center justify-between p-5 border-b border-navy-700/70">
          <h2 className="font-display text-base font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-navy-400 hover:text-white p-1.5 rounded-lg hover:bg-navy-700 transition-all active:scale-90"
          >
            <X size={18} />
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
    <div className="flex flex-col items-center justify-center py-14 text-center animate-fade-in">
      <div className="w-14 h-14 rounded-2xl bg-navy-700/80 flex items-center justify-center mb-4 text-navy-500">
        {icon}
      </div>
      <h3 className="font-display text-sm font-bold text-navy-300 mb-1">{title}</h3>
      {description && <p className="text-xs text-navy-600 max-w-xs mb-5">{description}</p>}
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
    blue:    "from-blue-600/20 to-blue-900/10 border-blue-600/20",
    emerald: "from-emerald-600/20 to-emerald-900/10 border-emerald-600/20",
    amber:   "from-amber-600/20 to-amber-900/10 border-amber-600/20",
    red:     "from-red-600/20 to-red-900/10 border-red-600/20",
    violet:  "from-violet-600/20 to-violet-900/10 border-violet-600/20",
    orange:  "from-orange-600/20 to-orange-900/10 border-orange-600/20",
  };
  const iconColors = {
    blue: "bg-blue-500/15", emerald: "bg-emerald-500/15", amber: "bg-amber-500/15",
    red: "bg-red-500/15", violet: "bg-violet-500/15", orange: "bg-orange-500/15",
  };

  return (
    <div className={`relative bg-gradient-to-br ${colors[color]} border rounded-xl p-5 overflow-hidden group transition-all duration-200 hover:scale-[1.02] hover:shadow-lg`}>
      <div className={`w-9 h-9 rounded-lg ${iconColors[color]} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <div className="font-display text-2xl font-bold text-white mb-0.5 count-up">{value}</div>
      <div className="text-[11px] font-semibold text-navy-400 font-display uppercase tracking-wider">{label}</div>
      {sub && <div className="text-[11px] text-navy-600 mt-0.5">{sub}</div>}
      {/* Subtle glow on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-gradient-to-br from-white/[0.02] to-transparent" />
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
    success: "bg-emerald-900/95 border-emerald-700/60 text-emerald-200",
    error:   "bg-red-900/95 border-red-700/60 text-red-200",
    info:    "bg-navy-800/95 border-navy-600/60 text-navy-200",
  };
  const icons = {
    success: "✓",
    error:   "✕",
    info:    "ℹ",
  };

  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className={`fixed bottom-5 right-5 z-[100] flex items-center gap-3 ${colors[type]} border text-sm font-medium px-4 py-3 rounded-xl shadow-2xl toast-enter max-w-sm backdrop-blur-sm`}
      style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}
    >
      <span className="text-base leading-none">{icons[type]}</span>
      <span className="flex-1">{message}</span>
      <button
        onClick={onClose}
        className="opacity-50 hover:opacity-100 transition-opacity ml-2 hover:scale-110 active:scale-90 transition-transform"
      >
        <X size={14} />
      </button>
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
        {subtitle && <p className="text-sm text-navy-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
