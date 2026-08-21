import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  LogOut,
  Save,
  Upload,
  Image as ImageIcon,
  Users,
  Building2,
  ExternalLink,
  Eye,
  EyeOff,
  Trash2,
  KeyRound,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";

type ClientProperty = {
  id: string;
  property_display_id: string;
  name: string;
  city: string | null;
  state: string | null;
  image_url: string | null;
  property_type: string | null;
};

type Lead = {
  id: string;
  property_id: string;
  full_name: string;
  phone: string;
  email: string | null;
  inquiry_type: string;
  amount: number | null;
  details: string | null;
  created_at: string;
};

type ClientAccount = {
  id: string;
  profile_id: string;
  active: boolean;
  display_name: string | null;
  username: string;
};

const defaultTypes = [
  "Property Enquiry",
  "Schedule a Visit",
  "Interested in Renting",
];

const formatInr = (v: number | null) =>
  v == null ? "—" : `₹${Number(v).toLocaleString("en-IN")}`;

export default function ClientPage() {
  const {
    user,
    profile,
    loading: authLoading,
    refreshProfile,
  } = useAuth();

  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [error, setError] = useState("");
  const [properties, setProperties] = useState<ClientProperty[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [config, setConfig] = useState<any | null>(null);
  const [images, setImages] = useState<any[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [tab, setTab] = useState<
    "overview" | "edit" | "leads"
  >("overview");

  const [clientAccount, setClientAccount] =
    useState<ClientAccount | null>(null);

  const current =
    properties.find((p) => p.id === selectedId) ||
    properties[0] ||
    null;

  useEffect(() => {
    if (
      user?.id &&
      profile?.role === "CLIENT"
    ) {
      loadClient();
    }
  }, [user?.id, profile?.role]);

  async function handleLogin(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setLoginLoading(true);
    setError("");

    try {
      const username = loginUsername
        .trim()
        .toLowerCase();

      if (!username) {
        setError("Enter your username.");
        return;
      }

      if (!loginPassword) {
        setError("Enter your password.");
        return;
      }

      const authEmail =
        `${username}@clients.renflix.app`;

      const {
        error: signInError,
      } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: loginPassword,
      });

      if (signInError) {
        console.error(
          "Client login failed:",
          signInError
        );

        setError(
          signInError.message ||
            "Invalid client username or password."
        );

        return;
      }

      await refreshProfile();
    } catch (err) {
      console.error("Client login error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to sign in."
      );
    } finally {
      setLoginLoading(false);
    }
  }

  async function loadClient() {
    if (!user?.id) {
      setError(
        "No authenticated client user was found."
      );
      return;
    }

    setLoading(true);
    setError("");

    try {
      console.log(
        "[RENFLIX CLIENT] Auth user:",
        user.id
      );

      /*
       * Step 1:
       * Load the client account that belongs to
       * the currently authenticated user.
       */
      const {
        data: account,
        error: accountError,
      } = await supabase
        .from("client_accounts")
        .select(
          "id,profile_id,active,display_name,username"
        )
        .eq("profile_id", user.id)
        .maybeSingle();

      console.log(
        "[RENFLIX CLIENT] Account:",
        account
      );

      if (accountError) {
        console.error(
          "[RENFLIX CLIENT] Account error:",
          accountError
        );

        setError(
          `Unable to load your client account: ${accountError.message}`
        );

        setProperties([]);
        setClientAccount(null);

        return;
      }

      if (!account) {
        setError(
          "Your login is valid, but no client account is linked to this user."
        );

        setProperties([]);
        setClientAccount(null);

        return;
      }

      if (!account.active) {
        setError(
          "This client account is inactive. Please contact the administrator."
        );

        setProperties([]);
        setClientAccount(account);

        return;
      }

      setClientAccount(account);

      /*
       * Step 2:
       * Load assigned properties through the
       * SECURITY DEFINER RPC.
       */
      const {
        data: rows,
        error: propertyError,
      } = await supabase.rpc(
        "get_current_client_properties"
      );

      console.log(
        "[RENFLIX CLIENT] Property RPC data:",
        rows
      );

      console.log(
        "[RENFLIX CLIENT] Property RPC error:",
        propertyError
      );

      if (propertyError) {
        console.error(
          "[RENFLIX CLIENT] Failed to load properties:",
          propertyError
        );

        setError(
          `Unable to load assigned properties: ${propertyError.message}`
        );

        setProperties([]);

        return;
      }

      const mapped: ClientProperty[] =
        Array.isArray(rows)
          ? rows.map((row: any) => ({
              id: row.id,
              property_display_id:
                row.property_display_id,
              name: row.name,
              city: row.city ?? null,
              state: row.state ?? null,
              image_url:
                row.image_url ?? null,
              property_type:
                row.property_type ?? null,
            }))
          : [];

      /*
       * Important:
       * Don't silently show "No properties assigned"
       * when the database says the client account exists
       * but the RPC returned nothing.
       */
      if (!mapped.length) {
        console.warn(
          "[RENFLIX CLIENT] Client account exists but RPC returned no properties.",
          {
            userId: user.id,
            clientAccountId: account.id,
            username: account.username,
          }
        );

        setProperties([]);
        setSelectedId("");

        /*
         * This message is intentionally diagnostic rather
         * than pretending the assignment doesn't exist.
         */
        setError(
          "Your client account is active, but no assigned properties were returned. Please refresh once or contact the administrator."
        );
      } else {
        setProperties(mapped);

        setSelectedId((previous) =>
          mapped.some(
            (property) =>
              property.id === previous
          )
            ? previous
            : mapped[0].id
        );
      }

      /*
       * Step 3:
       * Load the leads for this client account.
       */
      const {
        data: leadRows,
        error: leadError,
      } = await supabase
        .from("public_property_leads")
        .select("*")
        .eq("client_id", account.id)
        .order("created_at", {
          ascending: false,
        });

      if (leadError) {
        console.error(
          "[RENFLIX CLIENT] Lead loading error:",
          leadError
        );

        /*
         * Don't destroy a working property portal just
         * because lead loading fails.
         */
        setLeads([]);
      } else {
        setLeads(
          (leadRows || []) as Lead[]
        );
      }
    } catch (err) {
      console.error(
        "[RENFLIX CLIENT] Unexpected load error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load client portal."
      );

      setProperties([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (
      current?.id &&
      profile?.role === "CLIENT"
    ) {
      loadSelected(current.id);
    }
  }, [current?.id, profile?.role]);

  async function loadSelected(
    propertyId: string
  ) {
    setError("");

    try {
      const [
        configResult,
        imagesResult,
      ] = await Promise.all([
        supabase
          .from("public_property_configs")
          .select("*")
          .eq("property_id", propertyId)
          .maybeSingle(),

        supabase
          .from("public_property_images")
          .select("*")
          .eq("property_id", propertyId)
          .order("sort_order", {
            ascending: true,
          })
          .order("created_at", {
            ascending: true,
          }),
      ]);

      const {
        data: configData,
        error: configError,
      } = configResult;

      const {
        data: imagesData,
        error: imagesError,
      } = imagesResult;

      if (configError) {
        console.error(
          "Public config loading error:",
          configError
        );
      }

      if (imagesError) {
        console.error(
          "Public image loading error:",
          imagesError
        );
      }

      setConfig(
        configData ||
          {
            property_id: propertyId,
            is_public: true,
            headline:
              current?.name || "",
            public_description: "",
            features: [],
            inquiry_types: defaultTypes,
          }
      );

      setImages(imagesData || []);
    } catch (err) {
      console.error(
        "Unable to load selected property:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load property details."
      );
    }
  }

  const featureText = useMemo(
    () =>
      Array.isArray(config?.features)
        ? config.features.join("\n")
        : "",
    [config]
  );

  const typeText = useMemo(
    () =>
      Array.isArray(
        config?.inquiry_types
      )
        ? config.inquiry_types.join("\n")
        : defaultTypes.join("\n"),
    [config]
  );

  async function savePublicDetails(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!current || !config) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const features = featureText
        .split("\n")
        .map((x: string) => x.trim())
        .filter(Boolean);

      const inquiry_types = typeText
        .split("\n")
        .map((x: string) => x.trim())
        .filter(Boolean);

      const {
        error: saveError,
      } = await supabase
        .from("public_property_configs")
        .upsert(
          {
            ...config,
            property_id: current.id,
            features,
            inquiry_types,
            updated_at:
              new Date().toISOString(),
          },
          {
            onConflict: "property_id",
          }
        );

      if (saveError) {
        setError(saveError.message);
      } else {
        setConfig((previous: any) => ({
          ...previous,
          features,
          inquiry_types,
        }));
      }
    } catch (err) {
      console.error(
        "Saving public property failed:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to save public property details."
      );
    } finally {
      setSaving(false);
    }
  }

  async function uploadImages(
    files: FileList | null
  ) {
    if (!files || !current) {
      return;
    }

    setError("");

    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) {
        continue;
      }

      if (file.size > 8 * 1024 * 1024) {
        setError(
          "Each image must be 8 MB or less."
        );
        continue;
      }

      const safeName =
        `${Date.now()}-${file.name.replace(
          /[^a-zA-Z0-9._-]/g,
          "-"
        )}`;

      const path = `${current.id}/${safeName}`;

      const {
        error: uploadError,
      } = await supabase.storage
        .from("public-property-images")
        .upload(
          path,
          file,
          {
            cacheControl: "3600",
            upsert: false,
          }
        );

      if (uploadError) {
        setError(uploadError.message);
        continue;
      }

      const {
        data: urlData,
      } = supabase.storage
        .from("public-property-images")
        .getPublicUrl(path);

      const nextOrder = images.length
        ? Math.max(
            ...images.map((item) =>
              Number(
                item.sort_order || 0
              )
            )
          ) + 1
        : 0;

      const {
        data: row,
        error: rowError,
      } = await supabase
        .from("public_property_images")
        .insert({
          property_id: current.id,
          image_url:
            urlData.publicUrl,
          alt_text: current.name,
          sort_order: nextOrder,
        })
        .select("*")
        .single();

      if (!rowError && row) {
        setImages((previous) => [
          ...previous,
          row,
        ]);
      } else if (rowError) {
        setError(rowError.message);
      }
    }
  }

  async function removeImage(
    img: any
  ) {
    if (!current) {
      return;
    }

    setError("");

    const marker =
      `/public-property-images/${current.id}/`;

    const part = img.image_url?.includes(
      marker
    )
      ? img.image_url.split(marker)[1]
      : null;

    if (part) {
      await supabase.storage
        .from("public-property-images")
        .remove([
          `${current.id}/${part}`,
        ]);
    }

    const {
      error: deleteError,
    } = await supabase
      .from("public_property_images")
      .delete()
      .eq("id", img.id);

    if (deleteError) {
      setError(deleteError.message);
    } else {
      setImages((previous) =>
        previous.filter(
          (item) =>
            item.id !== img.id
        )
      );
    }
  }

  async function signOut() {
    await supabase.auth.signOut();

    setProperties([]);
    setLeads([]);
    setConfig(null);
    setImages([]);
    setSelectedId("");
    setClientAccount(null);
    setError("");
  }

  /*
   * AUTH LOADING
   */
  if (authLoading) {
    return (
      <Shell>
        <div className="text-slate-400">
          Loading client portal…
        </div>
      </Shell>
    );
  }

  /*
   * LOGIN SCREEN
   */
  if (
    !user ||
    profile?.role !== "CLIENT"
  ) {
    return (
      <ClientLogin
        loginUsername={
          loginUsername
        }
        setLoginUsername={
          setLoginUsername
        }
        loginPassword={
          loginPassword
        }
        setLoginPassword={
          setLoginPassword
        }
        handleLogin={handleLogin}
        loginLoading={
          loginLoading
        }
        error={error}
      />
    );
  }

  /*
   * PORTAL LOADING
   */
  if (loading) {
    return (
      <Shell>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin mx-auto" />
            <div className="text-slate-400 mt-4">
              Loading your properties…
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-7">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7">
          <div>
            <div className="text-xs font-mono uppercase tracking-[0.2em] text-blue-300">
              Client portal
            </div>

            <h1 className="font-display font-extrabold text-3xl sm:text-4xl mt-2">
              Manage your public properties.
            </h1>

            <p className="text-slate-500 mt-2">
              Edit what visitors see and track every enquiry in one
              place.
            </p>

            {clientAccount && (
              <div className="mt-3 text-xs text-slate-600 font-mono">
                @{clientAccount.username}
              </div>
            )}
          </div>

          <button
            onClick={signOut}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/[0.03] text-sm text-slate-300 hover:bg-white/[0.06]"
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>

        {error && (
          <div className="mb-5 p-4 rounded-xl border border-red-400/20 bg-red-500/10 text-red-300 text-sm">
            <div className="font-semibold mb-1">
              Client portal message
            </div>

            <div>{error}</div>

            {!properties.length && (
              <button
                type="button"
                onClick={loadClient}
                className="mt-3 inline-flex items-center rounded-lg bg-red-500/10 border border-red-400/20 px-3 py-2 text-xs text-red-200 hover:bg-red-500/20"
              >
                Refresh properties
              </button>
            )}
          </div>
        )}

        <div className="grid lg:grid-cols-[280px_1fr] gap-5">
          <aside className="rounded-3xl border border-white/8 bg-white/[0.025] p-3 h-fit lg:sticky lg:top-24">
            <div className="px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-slate-500">
              Your properties
            </div>

            {properties.map(
              (property) => (
                <button
                  key={property.id}
                  onClick={() => {
                    setSelectedId(
                      property.id
                    );
                    setTab("overview");
                    setError("");
                  }}
                  className={`w-full text-left p-3 rounded-2xl transition-colors ${
                    current?.id ===
                    property.id
                      ? "bg-blue-500/10 border border-blue-400/20"
                      : "hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex gap-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/[0.05] shrink-0">
                      {property.image_url ? (
                        <img
                          src={
                            property.image_url
                          }
                          className="w-full h-full object-cover"
                          alt={property.name}
                        />
                      ) : (
                        <Building2
                          className="m-3 text-slate-600"
                          size={24}
                        />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-white truncate">
                        {property.name}
                      </div>

                      <div className="text-[11px] text-blue-300 mt-1">
                        {property.property_display_id}
                      </div>

                      <div className="text-[11px] text-slate-500 truncate">
                        {property.city ||
                          "Location not set"}
                      </div>
                    </div>
                  </div>
                </button>
              )
            )}

            {!properties.length && (
              <div className="p-4">
                <div className="text-sm text-slate-400">
                  No properties were returned for this client account.
                </div>

                <div className="text-xs text-slate-600 mt-2 leading-5">
                  The account exists, but the assigned-property RPC
                  returned no records.
                </div>

                <button
                  type="button"
                  onClick={loadClient}
                  className="mt-4 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold"
                >
                  Refresh
                </button>
              </div>
            )}
          </aside>

          <section className="space-y-5">
            {current ? (
              <>
                <div className="rounded-3xl border border-white/8 bg-white/[0.025] p-5 sm:p-6">
                  <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                    <div>
                      <div className="text-[11px] font-mono text-blue-300">
                        /{current.property_display_id}
                      </div>

                      <h2 className="font-display font-extrabold text-2xl mt-1">
                        {current.name}
                      </h2>

                      <div className="text-sm text-slate-500 mt-1">
                        {current.city ||
                          "Location not set"}
                        {current.state
                          ? `, ${current.state}`
                          : ""}
                        {current.property_type
                          ? ` • ${current.property_type.replaceAll(
                              "_",
                              " "
                            )}`
                          : ""}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <a
                        href={`/${current.property_display_id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-slate-300 hover:bg-white/[0.06]"
                      >
                        <ExternalLink size={14} />
                        View public page
                      </a>

                      <button
                        onClick={() =>
                          setTab("edit")
                        }
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2.5 text-sm font-semibold hover:bg-blue-500"
                      >
                        Edit public page
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-5 border-t border-white/8 pt-4">
                    <button
                      onClick={() =>
                        setTab("overview")
                      }
                      className={`px-3 py-2 rounded-xl text-sm ${
                        tab === "overview"
                          ? "bg-blue-500/10 text-blue-300"
                          : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      Overview
                    </button>

                    <button
                      onClick={() =>
                        setTab("edit")
                      }
                      className={`px-3 py-2 rounded-xl text-sm ${
                        tab === "edit"
                          ? "bg-blue-500/10 text-blue-300"
                          : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      Public Page
                    </button>

                    <button
                      onClick={() =>
                        setTab("leads")
                      }
                      className={`px-3 py-2 rounded-xl text-sm ${
                        tab === "leads"
                          ? "bg-blue-500/10 text-blue-300"
                          : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      Leads (
                      {
                        leads.filter(
                          (lead) =>
                            lead.property_id ===
                            current.id
                        ).length
                      }
                      )
                    </button>
                  </div>
                </div>

                {tab === "overview" && (
                  <Overview
                    property={current}
                    config={config}
                    images={images}
                    leads={leads.filter(
                      (lead) =>
                        lead.property_id ===
                        current.id
                    )}
                    onEdit={() =>
                      setTab("edit")
                    }
                  />
                )}

                {tab === "leads" && (
                  <LeadTable
                    leads={leads.filter(
                      (lead) =>
                        lead.property_id ===
                        current.id
                    )}
                  />
                )}

                {tab === "edit" && (
                  <form
                    onSubmit={
                      savePublicDetails
                    }
                    className="space-y-5"
                  >
                    <div className="grid xl:grid-cols-2 gap-5">
                      <div className="rounded-3xl border border-white/8 bg-white/[0.025] p-5 sm:p-6">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <h3 className="font-display font-bold text-xl">
                              Public content
                            </h3>

                            <p className="text-xs text-slate-500 mt-1">
                              This is what visitors see.
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              setConfig(
                                (
                                  previous: any
                                ) => ({
                                  ...previous,
                                  is_public:
                                    !previous?.is_public,
                                })
                              )
                            }
                            className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs border ${
                              config?.is_public
                                ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                                : "border-white/10 text-slate-400"
                            }`}
                          >
                            {config?.is_public ? (
                              <Eye size={14} />
                            ) : (
                              <EyeOff size={14} />
                            )}

                            {config?.is_public
                              ? "Public"
                              : "Hidden"}
                          </button>
                        </div>

                        <div className="space-y-4 mt-6">
                          <Field
                            label="Headline"
                            value={
                              config?.headline ||
                              ""
                            }
                            onChange={(value) =>
                              setConfig(
                                (
                                  previous: any
                                ) => ({
                                  ...previous,
                                  headline:
                                    value,
                                })
                              )
                            }
                          />

                          <TextArea
                            label="Public description"
                            value={
                              config?.public_description ||
                              ""
                            }
                            onChange={(value) =>
                              setConfig(
                                (
                                  previous: any
                                ) => ({
                                  ...previous,
                                  public_description:
                                    value,
                                })
                              )
                            }
                          />

                          <TextArea
                            label="Features (one per line)"
                            value={
                              featureText
                            }
                            onChange={(value) =>
                              setConfig(
                                (
                                  previous: any
                                ) => ({
                                  ...previous,
                                  features:
                                    value
                                      .split(
                                        "\n"
                                      ),
                                })
                              )
                            }
                          />
                        </div>
                      </div>

                      <div className="rounded-3xl border border-white/8 bg-white/[0.025] p-5 sm:p-6">
                        <h3 className="font-display font-bold text-xl">
                          Visitor form types
                        </h3>

                        <p className="text-xs text-slate-500 mt-1">
                          Each line becomes an option in the enquiry form.
                        </p>

                        <div className="mt-6">
                          <TextArea
                            label="Types (one per line)"
                            value={typeText}
                            onChange={(value) =>
                              setConfig(
                                (
                                  previous: any
                                ) => ({
                                  ...previous,
                                  inquiry_types:
                                    value
                                      .split(
                                        "\n"
                                      ),
                                })
                              )
                            }
                          />
                        </div>

                        <div className="mt-5 rounded-2xl border border-blue-400/15 bg-blue-500/[0.06] p-4 text-xs text-slate-400 leading-5">
                          <KeyRound
                            size={16}
                            className="text-blue-400 inline mr-2"
                          />
                          Visitors can submit name, phone, optional email,
                          selected type, amount and details.
                        </div>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-white/8 bg-white/[0.025] p-5 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <h3 className="font-display font-bold text-xl">
                            Public photos
                          </h3>

                          <p className="text-xs text-slate-500 mt-1">
                            Upload the images you want visitors to see.
                          </p>
                        </div>

                        <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-semibold cursor-pointer">
                          <Upload size={15} />
                          Add images

                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(event) =>
                              uploadImages(
                                event.target.files
                              )
                            }
                          />
                        </label>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 mt-6">
                        {images.map(
                          (image) => (
                            <div
                              key={image.id}
                              className="group relative aspect-[4/3] rounded-2xl overflow-hidden border border-white/8"
                            >
                              <img
                                src={
                                  image.image_url
                                }
                                className="w-full h-full object-cover"
                                alt={
                                  image.alt_text ||
                                  current.name
                                }
                              />

                              <button
                                type="button"
                                onClick={() =>
                                  removeImage(
                                    image
                                  )
                                }
                                className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-black/65 text-red-300 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                              >
                                <Trash2
                                  size={14}
                                />
                              </button>
                            </div>
                          )
                        )}

                        {!images.length && (
                          <div className="col-span-full border border-dashed border-white/10 rounded-2xl p-10 text-center text-slate-500 text-sm">
                            <ImageIcon className="mx-auto mb-2 text-slate-600" />
                            No extra photos uploaded.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        disabled={saving}
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 font-semibold"
                      >
                        <Save size={15} />

                        {saving
                          ? "Saving..."
                          : "Save public page"}
                      </button>
                    </div>
                  </form>
                )}
              </>
            ) : (
              <div className="rounded-3xl border border-white/8 bg-white/[0.025] p-10 text-center">
                <Building2
                  size={48}
                  className="mx-auto text-slate-700"
                />

                <h2 className="font-display font-bold text-xl mt-5">
                  No property is available
                </h2>

                <p className="text-sm text-slate-500 mt-2 max-w-lg mx-auto">
                  The client account is active, but the property access
                  query did not return an assigned property.
                </p>

                <button
                  type="button"
                  onClick={loadClient}
                  className="mt-5 inline-flex items-center px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-semibold"
                >
                  Refresh properties
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </Shell>
  );
}

function Overview({
  property,
  config,
  images,
  leads,
  onEdit,
}: any) {
  return (
    <div className="grid xl:grid-cols-[1fr_330px] gap-5">
      <div className="rounded-3xl border border-white/8 bg-white/[0.025] overflow-hidden">
        <div className="aspect-[16/7] bg-white/[0.03]">
          {(
            images[0]?.image_url ||
            property.image_url
          ) ? (
            <img
              src={
                images[0]?.image_url ||
                property.image_url
              }
              className="w-full h-full object-cover"
              alt={property.name}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <Building2
                size={56}
                className="text-slate-700"
              />
            </div>
          )}
        </div>

        <div className="p-5">
          <div className="text-xs font-mono text-blue-300">
            {config?.headline ||
              property.name}
          </div>

          <p className="text-sm text-slate-400 leading-6 mt-2">
            {config?.public_description ||
              "No public description yet."}
          </p>

          <div className="flex flex-wrap gap-2 mt-4">
            {(config?.features || [])
              .slice(0, 8)
              .map(
                (feature: string) => (
                  <span
                    key={feature}
                    className="px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/8 text-xs text-slate-300"
                  >
                    {feature}
                  </span>
                )
              )}
          </div>

          <button
            onClick={onEdit}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold"
          >
            Edit public page
          </button>
        </div>
      </div>

      <div className="space-y-5">
        <div className="rounded-3xl border border-white/8 bg-white/[0.025] p-5">
          <div className="text-xs uppercase tracking-widest text-slate-500">
            Public status
          </div>

          <div className="flex items-center gap-2 mt-3">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                config?.is_public
                  ? "bg-emerald-400"
                  : "bg-slate-600"
              }`}
            />

            <span className="font-semibold">
              {config?.is_public
                ? "Live"
                : "Hidden"}
            </span>
          </div>
        </div>

        <div className="rounded-3xl border border-white/8 bg-white/[0.025] p-5">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <Users
              size={16}
              className="text-blue-400"
            />
            Leads received
          </div>

          <div className="font-display font-extrabold text-4xl mt-3">
            {leads.length}
          </div>

          <div className="text-xs text-slate-500 mt-1">
            For this property
          </div>
        </div>
      </div>
    </div>
  );
}

function LeadTable({
  leads,
}: {
  leads: Lead[];
}) {
  return (
    <div className="rounded-3xl border border-white/8 bg-white/[0.025] overflow-hidden">
      <div className="p-5 border-b border-white/8">
        <h3 className="font-display font-bold text-xl">
          Property leads
        </h3>

        <p className="text-xs text-slate-500 mt-1">
          Every enquiry submitted by visitors.
        </p>
      </div>

      {!leads.length ? (
        <div className="p-10 text-center text-slate-500 text-sm">
          No leads yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 text-left text-xs uppercase tracking-widest text-slate-500">
                <th className="px-4 py-3">
                  Visitor
                </th>
                <th className="px-4 py-3">
                  Contact
                </th>
                <th className="px-4 py-3">
                  Type
                </th>
                <th className="px-4 py-3">
                  Amount
                </th>
                <th className="px-4 py-3">
                  Details
                </th>
                <th className="px-4 py-3">
                  Received
                </th>
              </tr>
            </thead>

            <tbody>
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  className="border-b border-white/5"
                >
                  <td className="px-4 py-4">
                    <div className="font-semibold text-white">
                      {lead.full_name}
                    </div>

                    <div className="text-xs text-slate-500 mt-1">
                      {lead.phone}
                    </div>
                  </td>

                  <td className="px-4 py-4 text-slate-300">
                    {lead.email || "—"}
                  </td>

                  <td className="px-4 py-4">
                    <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-300 text-xs">
                      {lead.inquiry_type}
                    </span>
                  </td>

                  <td className="px-4 py-4 text-slate-300">
                    {formatInr(
                      lead.amount
                    )}
                  </td>

                  <td className="px-4 py-4 max-w-[300px] text-slate-400">
                    {lead.details || "—"}
                  </td>

                  <td className="px-4 py-4 text-slate-500 whitespace-nowrap">
                    {new Date(
                      lead.created_at
                    ).toLocaleString(
                      "en-IN"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs text-slate-400">
        {label}
      </span>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.035] px-3 py-3 text-sm text-white outline-none focus:border-blue-400"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs text-slate-400">
        {label}
      </span>

      <textarea
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        rows={6}
        className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.035] px-3 py-3 text-sm text-white outline-none focus:border-blue-400 resize-none"
      />
    </label>
  );
}

function Shell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#050914] text-white">
      {children}
    </div>
  );
}

function ClientLogin({
  loginUsername,
  setLoginUsername,
  loginPassword,
  setLoginPassword,
  handleLogin,
  loginLoading,
  error,
}: any) {
  return (
    <Shell>
      <div className="min-h-screen flex items-center justify-center px-5">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.035] p-7 shadow-[0_30px_100px_rgba(0,0,0,.35)]">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-400/20 flex items-center justify-center">
            <KeyRound className="text-blue-400" />
          </div>

          <div className="text-xs font-mono uppercase tracking-[0.2em] text-blue-300 mt-6">
            RENFLIX client portal
          </div>

          <h1 className="font-display font-extrabold text-3xl mt-2">
            Sign in to manage your properties.
          </h1>

          <p className="text-slate-500 text-sm mt-2">
            Your account is created and managed by the RENFLIX administrator.
          </p>

          {error && (
            <div className="mt-5 p-3 rounded-xl bg-red-500/10 border border-red-400/20 text-red-300 text-sm">
              {error}
            </div>
          )}

          <form
            onSubmit={handleLogin}
            className="mt-6 space-y-4"
          >
            <Field
              label="Username"
              value={loginUsername}
              onChange={
                setLoginUsername
              }
            />

            <Field
              label="Password"
              type="password"
              value={loginPassword}
              onChange={
                setLoginPassword
              }
            />

            <button
              disabled={loginLoading}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 font-semibold"
            >
              {loginLoading
                ? "Signing in…"
                : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </Shell>
  );
}