import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowRight, BedDouble, Building2, Check, ChevronLeft, ChevronRight, MapPin, Phone, Sparkles } from "lucide-react";
import { supabase } from "../../lib/supabase";

type PublicProperty = {
  id: string;
  property_display_id: string;
  name: string;
  property_type: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string | null;
  image_url: string | null;
  headline: string;
  public_description: string | null;
  features: string[];
  inquiry_types: string[];
  images: { id: string; image_url: string; alt_text?: string | null }[];
  units: { id: string; unit_number: string; unit_type: string | null; name: string | null; area: number | null; monthly_rent: number; status: string }[];
};

const money = (value: number) => `₹${Number(value || 0).toLocaleString("en-IN")}`;
const prettify = (value: string) => value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

export default function PublicPropertyPage() {
  const { propertyDisplayId } = useParams<{ propertyDisplayId: string }>();
  const navigate = useNavigate();
  const [property, setProperty] = useState<PublicProperty | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState("");
  const [amount, setAmount] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
    if (!propertyDisplayId) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_public_property", { p_display_id: propertyDisplayId });
      if (!error && data) {
        const next = data as PublicProperty;
        setProperty(next);
        setType(next.inquiry_types?.[0] || "Property Enquiry");
      } else {
        setProperty(null);
      }
      setLoading(false);
    })();
  }, [propertyDisplayId]);

  const gallery = useMemo(() => {
    if (!property) return [];
    const list = property.images?.map((x) => x.image_url) || [];
    if (property.image_url && !list.includes(property.image_url)) list.unshift(property.image_url);
    return Array.from(new Set(list));
  }, [property]);

  const availableUnits = property?.units?.filter((u) => u.status === "AVAILABLE") || [];
  const startingRent = availableUnits.length ? Math.min(...availableUnits.map((u) => Number(u.monthly_rent || 0))) : null;

  async function submitLead(e: React.FormEvent) {
    e.preventDefault();
    if (!property) return;
    setSubmitting(true);
    setMessage(null);
    const { error } = await supabase.rpc("submit_public_property_lead", {
      p_property_display_id: property.property_display_id,
      p_full_name: name,
      p_phone: phone,
      p_email: email || null,
      p_inquiry_type: type || "Property Enquiry",
      p_amount: amount ? Number(amount) : null,
      p_details: details || null,
    });
    if (error) {
      setMessage({ text: error.message || "Unable to send your enquiry.", error: true });
    } else {
      setMessage({ text: "Thanks! Your enquiry has been sent to the property representative." });
      setName(""); setPhone(""); setEmail(""); setAmount(""); setDetails("");
    }
    setSubmitting(false);
  }

  if (loading) {
    return <div className="min-h-screen bg-[#050914] text-white flex items-center justify-center"><div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-[#050914] text-white flex items-center justify-center p-6">
        <div className="max-w-md text-center rounded-3xl border border-white/10 bg-white/[0.04] p-8">
          <Building2 className="mx-auto text-blue-400" size={36} />
          <h1 className="font-display font-extrabold text-2xl mt-4">Property not available</h1>
          <p className="text-slate-400 mt-2">This property is not currently hosted publicly or the property ID is incorrect.</p>
          <button onClick={() => navigate("/")} className="mt-6 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold">Back to RENFLIX</button>
        </div>
      </div>
    );
  }

  const currentImage = gallery[activeImage] || gallery[0] || "";

  return (
    <div className="min-h-screen bg-[#050914] text-white overflow-x-hidden">
      <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#050914]/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="font-display font-extrabold tracking-tight text-xl">REN<span className="text-blue-400">FLIX</span></button>
          <div className="flex items-center gap-3 text-xs text-slate-400"><span className="hidden sm:inline">Property ID</span><span className="font-mono text-blue-300 px-2 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20">{property.property_display_id}</span></div>
        </div>
      </header>

      <main>
        <section className="relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(37,99,235,.20),transparent_34%),radial-gradient(circle_at_85%_25%,rgba(124,58,237,.14),transparent_30%)] pointer-events-none" />
          <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 pt-7 pb-10">
            <div className="grid lg:grid-cols-[1.12fr_.88fr] gap-6 items-stretch">
              <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.035] min-h-[390px] lg:min-h-[560px]">
                {currentImage ? <img src={currentImage} alt={property.name} className="absolute inset-0 w-full h-full object-cover" /> : <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-violet-600/5 flex items-center justify-center"><Building2 size={80} className="text-blue-400/50" /></div>}
                <div className="absolute inset-0 bg-gradient-to-t from-[#050914] via-transparent to-black/10" />
                {gallery.length > 1 && <>
                  <button onClick={() => setActiveImage((i) => (i - 1 + gallery.length) % gallery.length)} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/45 backdrop-blur-md border border-white/15 flex items-center justify-center hover:bg-black/70"><ChevronLeft size={18} /></button>
                  <button onClick={() => setActiveImage((i) => (i + 1) % gallery.length)} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/45 backdrop-blur-md border border-white/15 flex items-center justify-center hover:bg-black/70"><ChevronRight size={18} /></button>
                </>}
                <div className="absolute left-5 right-5 bottom-5 flex items-end justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/35 border border-white/10 backdrop-blur text-[11px] font-semibold text-blue-200"><Sparkles size={13} /> Verified on RENFLIX</div>
                    <h1 className="font-display font-extrabold text-3xl sm:text-5xl tracking-[-0.03em] mt-3">{property.name}</h1>
                  </div>
                  {startingRent !== null && <div className="rounded-2xl bg-black/45 backdrop-blur-md border border-white/10 px-4 py-3 text-right"><div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Starting from</div><div className="font-display font-bold text-xl text-white mt-1">{money(startingRent)}<span className="text-xs text-slate-400 font-normal"> / month</span></div></div>}
                </div>
              </div>

              <div className="rounded-[28px] border border-blue-400/20 bg-gradient-to-br from-blue-500/[0.12] via-white/[0.04] to-violet-500/[0.08] p-6 sm:p-8 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-mono uppercase tracking-[0.2em] text-blue-300">{prettify(property.property_type)}</div>
                  <h2 className="font-display font-extrabold text-3xl sm:text-4xl tracking-tight leading-[1.05] mt-3">{property.headline || property.name}</h2>
                  <p className="text-slate-400 leading-7 mt-5">{property.public_description || "Discover a property with the details, features and availability you need to make your next move."}</p>
                  <div className="flex items-start gap-3 mt-6 p-4 rounded-2xl bg-black/15 border border-white/8"><MapPin className="text-blue-400 mt-0.5 shrink-0" size={18} /><div className="text-sm text-slate-300">{property.address}, {property.city}, {property.state}{property.postal_code ? ` — ${property.postal_code}` : ""}</div></div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-6">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-4"><div className="text-[10px] uppercase tracking-widest text-slate-500">Available</div><div className="font-display font-bold text-xl mt-1">{availableUnits.length || "Ask"}</div><div className="text-xs text-slate-500">units right now</div></div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-4"><div className="text-[10px] uppercase tracking-widest text-slate-500">Enquiry</div><div className="font-display font-bold text-xl mt-1">Fast</div><div className="text-xs text-slate-500">property response</div></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-4 sm:py-8">
          <div className="grid lg:grid-cols-[1fr_390px] gap-8 items-start">
            <div className="space-y-8">
              <div className="rounded-3xl border border-white/8 bg-white/[0.025] p-6 sm:p-8">
                <div className="text-xs font-mono uppercase tracking-[0.2em] text-blue-300">Why this property</div>
                <h3 className="font-display font-extrabold text-2xl sm:text-3xl mt-2">A place designed to make the decision easy.</h3>
                <div className="grid sm:grid-cols-2 gap-3 mt-6">
                  {(property.features?.length ? property.features : ["Well-connected location", "Flexible rental options", "Comfortable living spaces", "Responsive property support"]).map((feature) => <div key={feature} className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-4"><span className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0"><Check size={15} /></span><span className="text-sm text-slate-300 leading-6">{feature}</span></div>)}
                </div>
              </div>

              {availableUnits.length > 0 && <div className="rounded-3xl border border-white/8 bg-white/[0.025] p-6 sm:p-8">
                <div className="flex items-center justify-between gap-4"><div><div className="text-xs font-mono uppercase tracking-[0.2em] text-blue-300">Availability</div><h3 className="font-display font-extrabold text-2xl mt-2">Choose the space that fits you.</h3></div><BedDouble className="text-blue-400" /></div>
                <div className="grid sm:grid-cols-2 gap-3 mt-6">
                  {availableUnits.map((unit) => <div key={unit.id} className="rounded-2xl border border-white/8 bg-black/10 p-4"><div className="flex justify-between gap-3"><div><div className="font-semibold text-white">{unit.name || `Unit ${unit.unit_number}`}</div><div className="text-xs text-slate-500 mt-1">{unit.unit_type || "Available unit"}{unit.area ? ` • ${unit.area} sq ft` : ""}</div></div><div className="font-display font-bold text-blue-300">{money(unit.monthly_rent)}</div></div></div>)}
                </div>
              </div>}

              {gallery.length > 1 && <div className="rounded-3xl border border-white/8 bg-white/[0.025] p-6 sm:p-8"><div className="flex items-center justify-between"><div><div className="text-xs font-mono uppercase tracking-[0.2em] text-blue-300">Gallery</div><h3 className="font-display font-extrabold text-2xl mt-2">See the property before you visit.</h3></div><span className="text-xs text-slate-500">{gallery.length} photos</span></div><div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6">{gallery.map((src, i) => <button key={src} onClick={() => { setActiveImage(i); window.scrollTo({ top: 120, behavior: "smooth" }); }} className="aspect-[4/3] overflow-hidden rounded-2xl border border-white/8"><img src={src} alt={`${property.name} ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform" /></button>)}</div></div>}
            </div>

            <aside className="lg:sticky lg:top-24 rounded-3xl border border-blue-400/20 bg-[#0a1222] shadow-[0_30px_80px_rgba(0,0,0,.35)] p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4"><div><div className="text-xs font-mono uppercase tracking-[0.2em] text-blue-300">Interested?</div><h3 className="font-display font-extrabold text-2xl mt-2">Tell us what you need.</h3><p className="text-sm text-slate-500 mt-2">A representative will receive your enquiry.</p></div><Phone className="text-blue-400 shrink-0" size={20} /></div>
              <form onSubmit={submitLead} className="space-y-3 mt-6">
                <Field label="Your name" value={name} onChange={setName} required placeholder="Enter your full name" />
                <Field label="Phone" value={phone} onChange={setPhone} required placeholder="10-digit mobile number" />
                <Field label="Email (optional)" value={email} onChange={setEmail} type="email" placeholder="you@example.com" />
                <label className="block"><span className="text-xs text-slate-400">I'm interested in</span><select value={type} onChange={(e) => setType(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white outline-none focus:border-blue-400">{property.inquiry_types.map((item) => <option key={item} value={item} className="bg-slate-900">{item}</option>)}</select></label>
                <Field label="Budget / amount (optional)" value={amount} onChange={setAmount} type="number" placeholder="e.g. 25000" />
                <label className="block"><span className="text-xs text-slate-400">Any details</span><textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={4} placeholder="Move-in date, preferred unit, questions..." className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white placeholder:text-slate-600 outline-none focus:border-blue-400 resize-none" /></label>
                {message && <div className={`rounded-xl px-3 py-2.5 text-xs ${message.error ? "bg-red-500/10 border border-red-400/20 text-red-300" : "bg-emerald-500/10 border border-emerald-400/20 text-emerald-300"}`}>{message.text}</div>}
                <button disabled={submitting} className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 py-3.5 font-semibold transition-all">{submitting ? "Sending..." : "Send enquiry"}<ArrowRight size={16} /></button>
                <p className="text-[10px] text-slate-600 text-center leading-5">By submitting, you allow the property representative to contact you about this property.</p>
              </form>
            </aside>
          </div>
        </section>
      </main>
    </div>
  );
}

function Field({ label, value, onChange, required, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; required?: boolean; type?: string; placeholder?: string }) {
  return <label className="block"><span className="text-xs text-slate-400">{label}{required ? " *" : ""}</span><input required={required} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white placeholder:text-slate-600 outline-none focus:border-blue-400" /></label>;
}
