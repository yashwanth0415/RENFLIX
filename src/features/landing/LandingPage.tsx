import { useState } from "react";
import { Link } from "react-router";
import {
  ArrowRight,
  BarChart3,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Home,
  Menu,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Users,
  Wrench,
  X,
  Zap,
} from "lucide-react";
// Import logo from public folder – no module errors
const logoSrc = "/logo.png";

const features = [
  {
    icon: Building2,
    title: "Property Management",
    description:
      "Manage your entire property portfolio, units, occupancy and property information from one workspace.",
  },
  {
    icon: CreditCard,
    title: "Rent & Payments",
    description:
      "Track rent collection, overdue payments, payment history and revenue without spreadsheets.",
  },
  {
    icon: Wrench,
    title: "Maintenance",
    description:
      "Turn maintenance requests into organized workflows with priorities, status and accountability.",
  },
  {
    icon: Users,
    title: "Tenant Management",
    description:
      "Keep tenant profiles, leases, communication and property relationships organized.",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    description:
      "See occupancy, revenue, collections and portfolio performance through actionable analytics.",
  },
  {
    icon: Sparkles,
    title: "RENFLIX Intelligence",
    description:
      "Transform property data into useful insights so you can identify problems and opportunities faster.",
  },
];

const stats = [
  { value: "10K+", label: "Properties managed" },
  { value: "25K+", label: "Tenants organized" },
  { value: "₹50Cr+", label: "Rent tracked" },
  { value: "50+", label: "Cities ready" },
];

const workflow = [
  {
    number: "01",
    title: "Connect your portfolio",
    description:
      "Bring your properties, units and tenants into one organized workspace.",
  },
  {
    number: "02",
    title: "Run your operations",
    description:
      "Manage rent, leases, maintenance, communication and daily property operations.",
  },
  {
    number: "03",
    title: "Understand your portfolio",
    description:
      "Use analytics and intelligence to make faster, better property decisions.",
  },
];

export default function LandingPage() {
  const [mobileMenu, setMobileMenu] = useState(false);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    setMobileMenu(false);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white overflow-x-hidden">
      {/* ─── BACKGROUND EFFECTS ─── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-64 left-1/2 -translate-x-1/2 w-[900px] h-[700px] rounded-full bg-blue-600/[0.08] blur-[140px]" />
        <div className="absolute top-[900px] -left-80 w-[600px] h-[600px] rounded-full bg-violet-600/[0.06] blur-[130px]" />
        <div className="absolute top-[1800px] -right-80 w-[600px] h-[600px] rounded-full bg-blue-500/[0.05] blur-[130px]" />

        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(148,163,184,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.5) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
      </div>

      {/* ─── HEADER (EVEN LARGER, NO PILL BORDER ON NAV) ─── */}
      <header className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-5xl">
        <div
          className={`backdrop-blur-xl bg-[#020617]/70 border border-white/[0.08] rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.05)] ${
            mobileMenu ? "rounded-b-none" : ""
          }`}
        >
          <nav className="relative flex items-center justify-between px-6 py-4">
            {/* Logo + Brand (larger, with image) */}
            <Link
              to="/"
              className="flex items-center gap-3 group"
              aria-label="RENFLIX home"
            >
              <div className="relative w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-[0_0_25px_rgba(59,130,246,0.4)] group-hover:shadow-[0_0_40px_rgba(59,130,246,0.6)] transition-shadow overflow-hidden">
                <img
                  src={logoSrc}
                  alt="RENFLIX"
                  className="w-full h-full object-cover rounded-xl"
                  onError={(e) => {
                    // Fallback to Home icon if image fails
                    e.currentTarget.style.display = "none";
                    e.currentTarget.parentElement!.classList.add("flex", "items-center", "justify-center");
                    e.currentTarget.parentElement!.innerHTML = `<svg class="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
                  }}
                />
                <div className="absolute inset-0 rounded-xl ring-1 ring-white/10" />
              </div>
              <div>
                <div className="font-display font-extrabold tracking-tight text-2xl sm:text-3xl leading-none">
                  REN<span className="text-blue-400">FLIX</span>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-[0.22em] font-mono">
                    Property OS
                  </span>
                  <span className="text-[8px] text-slate-600 font-mono">·</span>
                  <span className="text-[9px] sm:text-[10px] text-slate-600 font-mono tracking-tight">
                    by Yash
                  </span>
                </div>
              </div>
            </Link>

            {/* Desktop Nav – clean text buttons (no surrounding pill) */}
            <div className="hidden md:flex items-center gap-1">
              <button
                onClick={() => scrollTo("features")}
                className="px-5 py-2.5 rounded-full text-sm text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all"
              >
                Features
              </button>
              <button
                onClick={() => scrollTo("platform")}
                className="px-5 py-2.5 rounded-full text-sm text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all"
              >
                Platform
              </button>
              
              <button
                onClick={() => scrollTo("workflow")}
                className="px-5 py-2.5 rounded-full text-sm text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all"
              >
                How it works
              </button>
              <button
                onClick={() => scrollTo("security")}
                className="px-5 py-2.5 rounded-full text-sm text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all"
              >
                Security
              </button>
            </div>

            {/* Right side */}
            <div className="hidden md:flex items-center gap-3">
              <Link
                to="/login"
                className="px-5 py-2.5 rounded-full text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/[0.05] transition-all"
              >
                Sign in
              </Link>
              <Link
                to="/signup"
                className="group flex items-center gap-2 px-6 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-[0_0_25px_rgba(59,130,246,0.4)] hover:shadow-[0_0_35px_rgba(59,130,246,0.6)] transition-all"
              >
                Get started
                <ArrowRight
                  size={16}
                  className="group-hover:translate-x-0.5 transition-transform"
                />
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenu(!mobileMenu)}
              className="md:hidden w-10 h-10 rounded-full border border-white/10 bg-white/[0.04] flex items-center justify-center text-slate-300"
              aria-label="Toggle menu"
            >
              {mobileMenu ? <X size={20} /> : <Menu size={20} />}
            </button>
          </nav>

          {mobileMenu && (
            <div className="md:hidden relative border-t border-white/[0.06] bg-[#020617]/95 backdrop-blur-xl px-5 py-5 rounded-b-2xl">
              <div className="flex flex-col gap-1">
                {[
                  ["platform", "Platform"],
                  ["features", "Features"],
                  ["workflow", "How it works"],
                  ["security", "Security"],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => scrollTo(id)}
                    className="text-left px-4 py-3 rounded-xl text-sm text-slate-300 hover:bg-white/[0.05]"
                  >
                    {label}
                  </button>
                ))}
                <div className="h-px bg-white/[0.06] my-2" />
                <Link
                  to="/login"
                  onClick={() => setMobileMenu(false)}
                  className="px-4 py-3 rounded-xl text-sm text-slate-300"
                >
                  Sign in
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setMobileMenu(false)}
                  className="px-4 py-3 rounded-xl bg-blue-600 text-center text-sm font-semibold"
                >
                  Get started
                </Link>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ─── HERO SECTION (FULLY VISIBLE AT 100% ZOOM) ─── */}
      <main className="relative z-10">
        <section className="relative pt-28 sm:pt-36 pb-12 sm:pb-16">
          {/* Floating particles */}
          <div className="absolute top-0 left-0 right-0 bottom-0 overflow-hidden pointer-events-none">
            <div className="landing-float absolute top-1/4 left-[10%] w-2 h-2 rounded-full bg-blue-400/30 blur-sm" />
            <div className="landing-glow absolute bottom-1/3 right-[20%] w-3 h-3 rounded-full bg-violet-400/20 blur-sm" />
            <div className="landing-float absolute top-[15%] right-[15%] w-1.5 h-1.5 rounded-full bg-emerald-400/30 blur-sm" style={{ animationDelay: "2s" }} />
            <div className="landing-glow absolute bottom-[10%] left-[30%] w-2 h-2 rounded-full bg-blue-300/20 blur-sm" style={{ animationDelay: "1s" }} />
            <div className="landing-float absolute top-[60%] left-[60%] w-2.5 h-2.5 rounded-full bg-pink-400/20 blur-sm" style={{ animationDelay: "0.5s" }} />
          </div>

          <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-[0.95fr_1.05fr] gap-10 lg:gap-12 items-center">
              {/* Hero copy */}
              <div className="max-w-2xl animate-fade-in">
                <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-blue-400/20 bg-blue-500/[0.08] text-blue-300 text-xs font-semibold mb-6 backdrop-blur-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-70" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400" />
                  </span>
                  THE PROPERTY OPERATING SYSTEM
                </div>

                <h1 className="font-display font-extrabold tracking-[-0.045em] text-[clamp(2.5rem,5vw,4.8rem)] leading-[0.98]">
                  <span className="text-white">Every property.</span>
                  <br />
                  <span className="hero-gradient-text">One powerful</span>
                  <br />
                  <span className="text-white">platform.</span>
                </h1>

                <p className="mt-5 max-w-xl text-sm sm:text-base text-slate-400 leading-7">
                  Manage properties, tenants, leases, rent, maintenance and
                  portfolio performance from one intelligent workspace built
                  for modern property operations.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 mt-7">
                  <Link
                    to="/signup"
                    className="group inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-display font-semibold shadow-[0_12px_40px_rgba(37,99,235,0.25)] transition-all hover:-translate-y-0.5"
                  >
                    Start managing
                    <ArrowRight
                      size={17}
                      className="group-hover:translate-x-1 transition-transform"
                    />
                  </Link>
                  <button
                    onClick={() => scrollTo("platform")}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-slate-200 font-display font-semibold transition-all backdrop-blur-sm"
                  >
                    Explore platform
                    <ChevronDown size={16} />
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-6 text-xs text-slate-500">
                  <span className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-400" />
                    Supabase powered
                  </span>
                  <span className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-400" />
                    Secure by design
                  </span>
                  <span className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-400" />
                    Built for scale
                  </span>
                </div>
              </div>

              {/* Dashboard visual */}
              <DashboardPreview />
            </div>
          </div>
        </section>

        {/* ═══════ FEATURES SECTION (MOST ATTRACTIVE, RIGHT AFTER HERO) ═══════ */}
        <section id="features" className="scroll-mt-24 py-20 sm:py-28 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-500/[0.03] to-transparent pointer-events-none" />
          <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <div className="text-xs font-mono font-semibold tracking-[0.18em] uppercase text-blue-400 mb-4">
                POWERFUL FEATURES
              </div>
              <h2 className="font-display font-extrabold text-4xl sm:text-5xl text-white mb-4">
                Everything you need, <br />
                <span className="hero-gradient-text">built right in.</span>
              </h2>
              <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
                From tenant screening to maintenance requests, our platform brings all property management tasks into one intuitive workspace.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="group relative bg-white/[0.03] rounded-2xl border border-white/[0.08] p-6 hover:border-blue-400/20 transition-all duration-500 hover:bg-white/[0.06] hover:shadow-[0_0_30px_rgba(59,130,246,0.15)] hover:-translate-y-1"
                  >
                    {/* Gradient line on hover */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/5 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative z-10">
                      <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-400/15 flex items-center justify-center text-blue-400 group-hover:bg-blue-500/20 group-hover:border-blue-400/30 transition-colors">
                        <Icon size={22} />
                      </div>
                      <div className="mt-5">
                        <h3 className="font-display font-bold text-lg text-white group-hover:text-blue-200 transition-colors">
                          {feature.title}
                        </h3>
                        <p className="mt-2 text-sm text-slate-500 group-hover:text-slate-400 transition-colors leading-6">
                          {feature.description}
                        </p>
                      </div>
                      <div className="mt-4 flex items-center gap-2 text-xs text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        Learn more <ChevronRight size={14} />
                      </div>
                    </div>
                    {/* Index number */}
                    <span className="absolute top-4 right-4 text-[9px] font-mono text-slate-700 group-hover:text-blue-400/50 transition-colors">
                      0{index + 1}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ─── STATS (IMPROVED MOBILE ALIGNMENT) ─── */}
        <section className="border-y border-white/[0.06] bg-white/[0.015]">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-wrap items-center justify-between -mx-4">
              {stats.map((stat, idx) => (
                <div
                  key={stat.label}
                  className="w-1/2 lg:w-1/4 px-4 py-3 flex items-center gap-3 border-b border-white/[0.05] lg:border-b-0"
                >
                  <div className="flex-shrink-0 w-1 h-8 rounded-full bg-blue-500/50" />
                  <div>
                    <div className="font-display font-extrabold text-2xl sm:text-3xl text-white">
                      {stat.value}
                    </div>
                    <div className="text-xs sm:text-sm text-slate-500 mt-1">
                      {stat.label}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── PLATFORM (RENAMED TO OVERVIEW) ─── */}
        <section id="platform" className="scroll-mt-24 py-24 sm:py-32">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <div className="text-xs font-mono font-semibold tracking-[0.18em] uppercase text-blue-400 mb-4">
                ONE PLATFORM
              </div>
              <h2 className="font-display font-extrabold tracking-tight text-4xl sm:text-5xl text-white">
                Everything your property
                <br />
                <span className="text-slate-500">needs to run better.</span>
              </h2>
              <p className="mt-6 text-slate-400 text-base sm:text-lg leading-8 max-w-2xl">
                RENFLIX connects the operational pieces of property management
                into one system, giving you a clear view of what is happening
                across your portfolio.
              </p>
            </div>
            <div className="mt-14 grid md:grid-cols-3 gap-4">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="group relative rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 sm:p-7 hover:bg-white/[0.045] hover:border-blue-400/20 transition-all duration-300 hover:-translate-y-1"
                  >
                    <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-400/15 flex items-center justify-center text-blue-400 group-hover:bg-blue-500/15 transition-colors">
                      <Icon size={20} />
                    </div>
                    <div className="mt-6">
                      <h3 className="font-display font-bold text-lg text-white">
                        {feature.title}
                      </h3>
                      <p className="mt-2.5 text-sm leading-6 text-slate-500">
                        {feature.description}
                      </p>
                    </div>
                    <div className="absolute top-6 right-6 text-slate-700 group-hover:text-blue-400 transition-colors">
                      <ChevronRight size={17} />
                    </div>
                    <div className="absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-transparent via-blue-500/0 to-transparent group-hover:via-blue-500/50 transition-all" />
                    <span className="absolute top-3 right-3 text-[9px] font-mono text-slate-700">
                      0{index + 1}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ─── OPERATIONS SHOWCASE (unchanged) ─── */}
        <section className="py-24 sm:py-32 bg-white/[0.015] border-y border-white/[0.05]">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <div className="text-xs font-mono font-semibold tracking-[0.18em] uppercase text-blue-400 mb-4">
                  PROPERTY OPERATIONS
                </div>
                <h2 className="font-display font-extrabold tracking-tight text-4xl sm:text-5xl text-white leading-tight">
                  Replace scattered
                  <br />
                  <span className="gradient-text">property operations.</span>
                </h2>
                <p className="mt-6 text-slate-400 leading-8 max-w-xl">
                  Stop jumping between spreadsheets, messages, payment
                  records and maintenance lists. RENFLIX gives every part of
                  your portfolio a connected operational layer.
                </p>
                <div className="mt-8 space-y-4">
                  {[
                    "Centralized property and unit management",
                    "Tenant and lease lifecycle tracking",
                    "Rent collection and payment visibility",
                    "Maintenance workflows and priorities",
                    "Portfolio analytics and operational intelligence",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-400/20 flex items-center justify-center shrink-0">
                        <Check size={11} className="text-emerald-400" />
                      </div>
                      <span className="text-sm text-slate-300">{item}</span>
                    </div>
                  ))}
                </div>
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-2 mt-9 text-sm font-semibold text-blue-400 hover:text-blue-300"
                >
                  Build your property workspace
                  <ArrowRight size={15} />
                </Link>
              </div>
              <OperationsPanel />
            </div>
          </div>
        </section>

        {/* ─── WORKFLOW ─── */}
        <section id="workflow" className="scroll-mt-24 py-24 sm:py-32">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto">
              <div className="text-xs font-mono font-semibold tracking-[0.18em] uppercase text-blue-400 mb-4">
                HOW IT WORKS
              </div>
              <h2 className="font-display font-extrabold tracking-tight text-4xl sm:text-5xl text-white">
                Simple to start.
                <br />
                <span className="text-slate-500">Powerful as you grow.</span>
              </h2>
            </div>
            <div className="mt-16 grid md:grid-cols-3 gap-5">
              {workflow.map((item, index) => (
                <div key={item.number} className="relative">
                  {index < workflow.length - 1 && (
                    <div className="hidden md:block absolute top-8 left-[calc(100%-8px)] w-[calc(100%-10px)] h-px bg-gradient-to-r from-blue-500/30 to-transparent" />
                  )}
                  <div className="relative rounded-2xl border border-white/[0.07] bg-white/[0.025] p-7 h-full">
                    <div className="font-mono text-xs text-blue-400 mb-8">
                      / {item.number}
                    </div>
                    <h3 className="font-display font-bold text-xl text-white">
                      {item.title}
                    </h3>
                    <p className="mt-3 text-sm text-slate-500 leading-6">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── INTELLIGENCE ─── */}
        <section className="py-24 sm:py-32">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
            <div className="relative overflow-hidden rounded-[28px] border border-blue-400/15 bg-gradient-to-br from-blue-950/50 via-[#0a0f1e] to-violet-950/20 p-8 sm:p-12 lg:p-16">
              <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-blue-500/15 blur-[100px]" />
              <div className="absolute -bottom-40 left-20 w-80 h-80 rounded-full bg-violet-500/10 blur-[100px]" />
              <div className="relative grid lg:grid-cols-2 gap-12 items-center">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-400/20 bg-violet-500/10 text-violet-300 text-xs font-semibold">
                    <Sparkles size={13} />
                    RENFLIX INTELLIGENCE
                  </div>
                  <h2 className="mt-6 font-display font-extrabold tracking-tight text-4xl sm:text-5xl text-white leading-tight">
                    Don't just see
                    <br />
                    <span className="gradient-text">your data.</span>
                    <br />
                    Understand it.
                  </h2>
                  <p className="mt-6 text-slate-400 leading-8 max-w-xl">
                    Turn your property data into a clearer operating picture.
                    Identify overdue rent, maintenance pressure, occupancy
                    changes and portfolio opportunities faster.
                  </p>
                  <Link
                    to="/signup"
                    className="inline-flex items-center gap-2 mt-8 px-5 py-3 rounded-xl bg-white text-slate-950 text-sm font-bold hover:bg-slate-100 transition-colors"
                  >
                    Explore RENFLIX
                    <ArrowRight size={15} />
                  </Link>
                </div>
                <IntelligencePanel />
              </div>
            </div>
          </div>
        </section>

        {/* ─── SECURITY ─── */}
        <section
          id="security"
          className="scroll-mt-24 py-24 sm:py-28 border-t border-white/[0.05]"
        >
          <div className="max-w-5xl mx-auto px-5 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-400/15 flex items-center justify-center text-emerald-400 mx-auto">
                <ShieldCheck size={23} />
              </div>
              <h2 className="mt-6 font-display font-extrabold text-3xl sm:text-4xl text-white">
                Built with security in mind.
              </h2>
              <p className="mt-4 text-slate-500 max-w-2xl mx-auto leading-7">
                RENFLIX uses authenticated access, Supabase-backed data
                services and database-level security policies to help keep
                property information protected.
              </p>
              <div className="mt-10 grid sm:grid-cols-3 gap-4 text-left">
                {[
                  {
                    icon: ShieldCheck,
                    title: "Authenticated access",
                    text: "Users access operational data through authenticated sessions.",
                  },
                  {
                    icon: Zap,
                    title: "Fast infrastructure",
                    text: "Modern React infrastructure with Supabase-backed services.",
                  },
                  {
                    icon: MessageSquare,
                    title: "Connected operations",
                    text: "Keep property, tenant and operational workflows connected.",
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5"
                    >
                      <Icon size={18} className="text-blue-400" />
                      <h3 className="mt-4 font-display font-semibold text-white text-sm">
                        {item.title}
                      </h3>
                      <p className="mt-2 text-xs text-slate-500 leading-5">
                        {item.text}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ─── FINAL CTA ─── */}
        <section className="py-24 sm:py-32">
          <div className="max-w-5xl mx-auto px-5 sm:px-6 lg:px-8">
            <div className="relative text-center overflow-hidden rounded-[30px] border border-white/[0.08] bg-white/[0.025] px-6 py-16 sm:px-12 sm:py-20">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[220px] bg-blue-600/15 blur-[90px] rounded-full" />
              <div className="relative">
                <div className="text-xs font-mono uppercase tracking-[0.2em] text-blue-400">
                  START BUILDING
                </div>
                <h2 className="mt-5 font-display font-extrabold tracking-tight text-4xl sm:text-6xl text-white">
                  Your properties deserve
                  <br />
                  <span className="gradient-text">a better system.</span>
                </h2>
                <p className="mt-6 max-w-xl mx-auto text-slate-500 leading-7">
                  Bring your property operations together with RENFLIX.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-3 mt-9">
                  <Link
                    to="/signup"
                    className="group inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold shadow-xl shadow-blue-600/20 transition-all"
                  >
                    Get started
                    <ArrowRight
                      size={16}
                      className="group-hover:translate-x-1 transition-transform"
                    />
                  </Link>
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center px-6 py-3.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-slate-200 font-semibold transition-all"
                  >
                    Sign in
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ─── FOOTER (IMPROVED) ─── */}
      <footer className="relative z-10 border-t border-white/[0.06] bg-[#020617]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand column */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                <Home size={14} />
              </div>
              <span className="font-display font-extrabold text-lg">
                REN<span className="text-blue-400">FLIX</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-5 mb-4">
              The modern Property Operating System. Manage everything from one workspace.
            </p>
            <p className="text-[10px] text-slate-600">
              Built by <span className="text-white font-medium">Yashwanth</span>
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-widest mb-4">
              Quick Links
            </h4>
            <ul className="space-y-2 text-xs text-slate-500">
              <li>
                <button onClick={() => scrollTo("platform")} className="hover:text-blue-400 transition-colors">
                  Platform
                </button>
              </li>
              <li>
                <button onClick={() => scrollTo("features")} className="hover:text-blue-400 transition-colors">
                  Features
                </button>
              </li>
              <li>
                <button onClick={() => scrollTo("workflow")} className="hover:text-blue-400 transition-colors">
                  How it works
                </button>
              </li>
              <li>
                <button onClick={() => scrollTo("security")} className="hover:text-blue-400 transition-colors">
                  Security
                </button>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-widest mb-4">
              Contact
            </h4>
            <ul className="space-y-2 text-xs text-slate-500">
              <li>
                <a
                  href="mailto:thupatiyashwanth@gmail.com"
                  className="hover:text-blue-400 transition-colors inline-flex items-center gap-1.5"
                >
                  <MessageSquare size={12} />
                  thupatiyashwanth@gmail.com
                </a>
              </li>
              <li>
                <a
                  href="tel:+919849954617"
                  className="hover:text-blue-400 transition-colors inline-flex items-center gap-1.5"
                >
                  <Zap size={12} />
                  9849954617
                </a>
              </li>
            </ul>
          </div>

          {/* Legal & extra */}
          <div>
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-widest mb-4">
              Legal
            </h4>
            <ul className="space-y-2 text-xs text-slate-500">
              <li>
                <Link to="/privacy" className="hover:text-blue-400 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-blue-400 transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <span className="text-slate-600">© {new Date().getFullYear()} RENFLIX</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/[0.05] py-4 text-center text-[10px] text-slate-600">
          All rights reserved. RENFLIX – Property OS.
        </div>
      </footer>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   DASHBOARD PREVIEW (unchanged)
═══════════════════════════════════════════════════════════════════════ */

function DashboardPreview() {
  // ... (same as before, no changes)
  return (
    <div className="relative animate-slide-in-right">
      <div className="absolute -inset-6 bg-blue-600/[0.08] blur-[60px] rounded-full" />
      <div className="relative rounded-[22px] border border-white/10 bg-[#0a0f1e]/95 shadow-[0_30px_80px_rgba(0,0,0,0.5)] overflow-hidden rotate-[1deg] hover:rotate-0 transition-transform duration-700">
        <div className="h-10 px-4 flex items-center gap-2 border-b border-white/[0.06] bg-white/[0.02]">
          <span className="w-2 h-2 rounded-full bg-red-400/60" />
          <span className="w-2 h-2 rounded-full bg-amber-400/60" />
          <span className="w-2 h-2 rounded-full bg-emerald-400/60" />
          <div className="ml-3 h-5 flex-1 max-w-[240px] rounded-md bg-white/[0.035] border border-white/[0.04] flex items-center px-2.5">
            <span className="text-[8px] text-slate-600 font-mono">
              app.renflix.com/dashboard
            </span>
          </div>
        </div>
        <div className="flex min-h-[340px] sm:min-h-[380px]">
          <div className="hidden sm:block w-32 border-r border-white/[0.06] p-2.5">
            <div className="flex items-center gap-1.5 px-1.5 py-2.5 mb-2">
              <div className="w-5 h-5 rounded-md bg-blue-600 flex items-center justify-center">
                <Home size={10} />
              </div>
              <span className="font-display font-bold text-[9px]">RENFLIX</span>
            </div>
            <div className="space-y-0.5">
              {[
                "Dashboard",
                "Properties",
                "Tenants",
                "Leases",
                "Payments",
                "Maintenance",
              ].map((item, index) => (
                <div
                  key={item}
                  className={`px-2 py-1.5 rounded-lg text-[8px] ${
                    index === 0
                      ? "bg-blue-500/10 text-blue-400"
                      : "text-slate-600"
                  }`}
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 p-3 sm:p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[7px] text-slate-600 font-mono uppercase tracking-wider">
                  Portfolio overview
                </div>
                <div className="font-display font-bold text-sm sm:text-base mt-0.5">
                  Good morning, Yashwanth
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-lg bg-white/[0.04] border border-white/[0.06]" />
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-violet-600" />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <MiniMetric label="Properties" value="24" icon={<Building2 size={10} />} />
              <MiniMetric label="Occupancy" value="94%" icon={<Users size={10} />} positive />
              <MiniMetric label="Rent roll" value="₹12.4L" icon={<CreditCard size={10} />} />
              <MiniMetric label="Maintenance" value="08" icon={<Wrench size={10} />} warning />
            </div>
            <div className="mt-3 grid sm:grid-cols-[1.4fr_0.8fr] gap-3">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="flex items-center justify-between">
                  <div className="text-[9px] font-semibold text-slate-300">
                    Revenue overview
                  </div>
                  <div className="text-[7px] text-emerald-400">+12.8%</div>
                </div>
                <div className="h-24 mt-3 relative">
                  <div className="absolute inset-x-0 top-0 border-t border-white/[0.04]" />
                  <div className="absolute inset-x-0 top-1/2 border-t border-white/[0.04]" />
                  <div className="absolute inset-x-0 bottom-0 border-t border-white/[0.04]" />
                  <svg
                    viewBox="0 0 500 130"
                    className="w-full h-full overflow-visible"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0 105 C55 95 75 82 120 88 S175 72 210 78 S265 45 300 58 S350 32 390 42 S450 20 500 28 L500 130 L0 130 Z"
                      fill="url(#revenueFill)"
                    />
                    <path
                      d="M0 105 C55 95 75 82 120 88 S175 72 210 78 S265 45 300 58 S350 32 390 42 S450 20 500 28"
                      fill="none"
                      stroke="#60a5fa"
                      strokeWidth="3"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                </div>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="text-[9px] font-semibold text-slate-300">
                  Occupancy
                </div>
                <div className="flex items-center justify-center py-4">
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24">
                    <svg
                      viewBox="0 0 100 100"
                      className="w-full h-full -rotate-90"
                    >
                      <circle
                        cx="50"
                        cy="50"
                        r="39"
                        fill="none"
                        stroke="#1e293b"
                        strokeWidth="9"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="39"
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="9"
                        strokeLinecap="round"
                        strokeDasharray="245"
                        strokeDashoffset="15"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="font-display font-bold text-base sm:text-lg">
                        94%
                      </span>
                      <span className="text-[6px] text-slate-600 uppercase">
                        occupied
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <PreviewRow label="Rent collected" value="₹8.7L" />
              <PreviewRow label="Open requests" value="08" />
              <PreviewRow label="Active leases" value="21" />
            </div>
          </div>
        </div>
      </div>
      <div className="absolute -bottom-4 -left-3 sm:-left-6 px-3 py-2.5 rounded-xl border border-emerald-400/15 bg-[#0a0f1e]/95 backdrop-blur-xl shadow-xl flex items-center gap-2 animate-bounce-slow">
        <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center">
          <Check size={13} className="text-emerald-400" />
        </div>
        <div>
          <div className="text-[7px] text-slate-500">Rent collection</div>
          <div className="text-[10px] font-semibold text-emerald-400">
            Up to date
          </div>
        </div>
      </div>
    </div>
  );
}

// ... (MiniMetric, PreviewRow, OperationsPanel, IntelligencePanel, Signal – same as previous code)
function MiniMetric({ label, value, icon, positive, warning }: { label: string; value: string; icon: React.ReactNode; positive?: boolean; warning?: boolean }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2">
      <div className="flex items-center gap-1.5 text-slate-600">
        {icon}
        <span className="text-[7px]">{label}</span>
      </div>
      <div className={`font-display font-bold text-xs mt-1.5 ${positive ? "text-emerald-400" : warning ? "text-amber-400" : "text-white"}`}>
        {value}
      </div>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/[0.02] border border-white/[0.05] p-1.5">
      <div className="text-[6px] text-slate-600">{label}</div>
      <div className="text-[9px] font-semibold text-slate-300 mt-0.5">{value}</div>
    </div>
  );
}

function OperationsPanel() {
  const items = [
    { icon: Building2, title: "24 Properties", value: "₹12.4L rent roll", color: "text-blue-400", bg: "bg-blue-500/10" },
    { icon: Users, title: "128 Active tenants", value: "94% occupancy", color: "text-violet-400", bg: "bg-violet-500/10" },
    { icon: CreditCard, title: "Payments", value: "₹8.7L collected", color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { icon: Wrench, title: "Maintenance", value: "8 open requests", color: "text-amber-400", bg: "bg-amber-500/10" },
  ];
  return (
    <div className="relative">
      <div className="rounded-[24px] border border-white/[0.07] bg-[#0a0f1e]/80 backdrop-blur-xl p-5 sm:p-7">
        <div className="flex items-center justify-between pb-5 border-b border-white/[0.06]">
          <div>
            <div className="text-[9px] text-slate-600 uppercase tracking-widest font-mono">Portfolio</div>
            <div className="font-display font-bold text-lg mt-1">Operations center</div>
          </div>
          <div className="flex items-center gap-2 text-[9px] text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            LIVE
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-5">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className={`w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center ${item.color}`}>
                  <Icon size={15} />
                </div>
                <div className="text-xs font-semibold text-slate-300 mt-4">{item.title}</div>
                <div className="text-[10px] text-slate-600 mt-1">{item.value}</div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 rounded-xl border border-blue-400/10 bg-blue-500/[0.05] p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">
              <Sparkles size={15} />
            </div>
            <div>
              <div className="text-xs font-semibold text-blue-300">RENFLIX Intelligence</div>
              <p className="text-[10px] text-slate-500 leading-5 mt-1">3 properties have maintenance activity above your portfolio average.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function IntelligencePanel() {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#050a14]/80 backdrop-blur-xl p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-slate-300">Portfolio signals</div>
        <div className="px-2 py-1 rounded-md bg-blue-500/10 text-blue-400 text-[8px] font-mono">AI</div>
      </div>
      <div className="space-y-3 mt-5">
        <Signal title="Rent collection" description="Collection is trending above last month." value="+12.8%" type="positive" />
        <Signal title="Occupancy" description="Portfolio occupancy remains strong." value="94%" type="positive" />
        <Signal title="Maintenance" description="8 requests require attention." value="08" type="warning" />
      </div>
      <div className="mt-5 pt-4 border-t border-white/[0.06] flex items-center gap-2">
        <Sparkles size={13} className="text-violet-400" />
        <span className="text-[9px] text-slate-500">Insights update as your portfolio changes.</span>
      </div>
    </div>
  );
}

function Signal({ title, description, value, type }: { title: string; description: string; value: string; type: "positive" | "warning" }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${type === "positive" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>
        {type === "positive" ? <Zap size={14} /> : <Wrench size={14} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-semibold text-slate-300">{title}</div>
        <div className="text-[8px] text-slate-600 truncate mt-0.5">{description}</div>
      </div>
      <div className={`font-mono text-xs font-semibold ${type === "positive" ? "text-emerald-400" : "text-amber-400"}`}>
        {value}
      </div>
    </div>
  );
}
