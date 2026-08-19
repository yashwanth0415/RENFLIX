import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  User,
  Building2,
  Shield,
  Mail,
  Phone,
  LogOut,
} from "lucide-react";

import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";

import {
  Button,
  Input,
  Select,
  Card,
  PageHeader,
  Toast,
} from "../../components/ui";

import type { UserRole } from "../../lib/types";

import {
  isEmailIdentifier,
  normalizeIndianPhone,
} from "../../lib/auth";

const ROLES: {
  value: UserRole;
  label: string;
}[] = [
  {
    value: "OWNER",
    label: "Property Owner",
  },
  {
    value: "PROPERTY_MANAGER",
    label: "Property Manager",
  },
  {
    value: "TENANT",
    label: "Tenant",
  },
  {
    value: "HOSTEL_MANAGER",
    label: "Hostel / PG Manager",
  },
  {
    value: "COMMUNITY_MANAGER",
    label: "Community Manager",
  },
  {
    value: "TECHNICIAN",
    label: "Technician",
  },
];

type SettingsTab = "profile" | "org" | "security";

export default function SettingsPage() {
  const {
    profile,
    user,
    refreshProfile,
  } = useAuth();

  const navigate = useNavigate();
  const [theme, setTheme] = useState<"dark" | "light">(() => (localStorage.getItem("renflix-theme") as "dark" | "light") || "dark");
  const [deviceNotifications, setDeviceNotifications] = useState(() => "Notification" in window && Notification.permission === "granted");
  useEffect(() => { document.documentElement.classList.toggle("theme-light", theme === "light"); localStorage.setItem("renflix-theme", theme); }, [theme]);
  async function toggleDeviceNotifications() { if (!("Notification" in window)) return; const permission = await Notification.requestPermission(); setDeviceNotifications(permission === "granted"); }

  const [tab, setTab] =
    useState<SettingsTab>(
      "profile"
    );

  // ------------------------------------------------------------
  // Profile
  // ------------------------------------------------------------

  const [profileForm, setProfileForm] =
    useState({
      full_name: "",
      email: "",
      phone: "",
    });

  // ------------------------------------------------------------
  // Organization
  // ------------------------------------------------------------

  const [orgForm, setOrgForm] =
    useState({
      name: "",
    });

  // ------------------------------------------------------------
  // Password
  // ------------------------------------------------------------

  const [passwordForm, setPasswordForm] =
    useState({
      password: "",
      confirm: "",
    });

  // ------------------------------------------------------------
  // Loading / feedback
  // ------------------------------------------------------------

  const [submitting, setSubmitting] =
    useState(false);

  const [toast, setToast] =
    useState<{
      msg: string;
      type: "success" | "error";
    } | null>(null);

  // ------------------------------------------------------------
  // Role modal
  // ------------------------------------------------------------

  const [showRoleModal, setShowRoleModal] =
    useState(false);

  const [selectedRole, setSelectedRole] =
    useState<UserRole>(
      profile?.role ||
        "OWNER"
    );

  const [roleConfirmError, setRoleConfirmError] =
    useState("");

  // ------------------------------------------------------------
  // Populate profile form
  // ------------------------------------------------------------

  useEffect(() => {
    if (!profile && !user) {
      return;
    }

    setProfileForm({
      full_name:
        profile?.full_name ||
        "",

      email:
        profile?.email ||
        user?.email ||
        "",

      phone:
        profile?.phone ||
        user?.phone ||
        "",
    });

    if (profile?.role) {
      setSelectedRole(
        profile.role as UserRole
      );
    }
  }, [
    profile,
    user,
  ]);

  // ------------------------------------------------------------
  // Load organization
  // ------------------------------------------------------------

  useEffect(() => {
    if (!profile?.organization_id) {
      setOrgForm({
        name: "",
      });

      return;
    }

    let mounted = true;

    supabase
      .from("organizations")
      .select("name")
      .eq(
        "id",
        profile.organization_id
      )
      .maybeSingle()
      .then(
        ({
          data,
          error,
        }) => {
          if (!mounted) {
            return;
          }

          if (error) {
            console.error(
              "Organization load error:",
              error
            );

            return;
          }

          setOrgForm({
            name:
              data?.name ||
              "",
          });
        }
      );

    return () => {
      mounted = false;
    };
  }, [
    profile?.organization_id,
  ]);

  // ------------------------------------------------------------
  // Save profile
  // ------------------------------------------------------------

  async function saveProfile(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!user) {
      setToast({
        msg:
          "You are not signed in.",
        type: "error",
      });

      return;
    }

    if (profile?.role === "TENANT") {
      setToast({ msg: "Tenant account details are managed by the property owner. Use Dashboard to update emergency contact information.", type: "error" });
      return;
    }

    setSubmitting(true);
    setToast(null);

    const previousEmail =
      (
        user.email ||
        profile?.email ||
        ""
      )
        .trim()
        .toLowerCase();

    const previousPhone =
      user.phone ||
      profile?.phone ||
      "";

    try {
      const fullName =
        profileForm.full_name.trim();

      const newEmail =
        profileForm.email
          .trim()
          .toLowerCase();

      if (!fullName) {
        throw new Error(
          "Full name is required."
        );
      }

      // --------------------------------------------------------
      // Validate email
      // --------------------------------------------------------

      if (!newEmail) {
        throw new Error(
          "Email address is required."
        );
      }

      if (!isEmailIdentifier(newEmail)) {
        throw new Error(
          "Enter a valid email address."
        );
      }

      // --------------------------------------------------------
      // Validate phone
      // --------------------------------------------------------

      if (
        !profileForm.phone.trim()
      ) {
        throw new Error(
          "Phone number is required."
        );
      }

      const normalizedPhone =
        normalizeIndianPhone(
          profileForm.phone
        );

      // --------------------------------------------------------
      // Determine Auth changes
      // --------------------------------------------------------

      const authUpdates: {
        email?: string;
        phone?: string;
      } = {};

      if (
        newEmail !==
        previousEmail
      ) {
        authUpdates.email =
          newEmail;
      }

      if (
        normalizedPhone !==
        previousPhone
      ) {
        authUpdates.phone =
          normalizedPhone;
      }

      // --------------------------------------------------------
      // Update Supabase Auth
      // --------------------------------------------------------

      if (
        Object.keys(
          authUpdates
        ).length > 0
      ) {
        const {
          error: authError,
        } =
          await supabase.auth.updateUser(
            authUpdates
          );

        if (authError) {
          throw new Error(
            authError.message
          );
        }
      }

      // --------------------------------------------------------
      // Update public.profiles
      // --------------------------------------------------------

      const {
        error: profileError,
      } =
        await supabase
          .from("profiles")
          .update({
            full_name:
              fullName,

            email:
              newEmail,

            phone:
              normalizedPhone,

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            user.id
          );

      // --------------------------------------------------------
      // If profiles failed after Auth was already updated,
      // attempt to restore the Auth identifiers.
      // --------------------------------------------------------

      if (profileError) {
        const rollbackUpdates: {
          email?: string;
          phone?: string;
        } = {};

        if (
          authUpdates.email &&
          previousEmail
        ) {
          rollbackUpdates.email =
            previousEmail;
        }

        if (
          authUpdates.phone &&
          previousPhone
        ) {
          rollbackUpdates.phone =
            previousPhone;
        }

        if (
          Object.keys(
            rollbackUpdates
          ).length > 0
        ) {
          try {
            await supabase.auth.updateUser(
              rollbackUpdates
            );
          } catch (
            rollbackError
          ) {
            console.error(
              "RENFLIX Auth rollback failed:",
              rollbackError
            );
          }
        }

        throw new Error(
          profileError.message
        );
      }

      // --------------------------------------------------------
      // Refresh application state
      // --------------------------------------------------------

      await refreshProfile();

      setProfileForm({
        full_name:
          fullName,

        email:
          newEmail,

        phone:
          normalizedPhone,
      });

      setToast({
        msg:
          "Profile updated successfully.",
        type: "success",
      });
    } catch (err) {
      console.error(
        "RENFLIX profile update error:",
        err
      );

      setToast({
        msg:
          err instanceof Error
            ? err.message
            : "Unable to update your profile.",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  // ------------------------------------------------------------
  // Save organization
  // ------------------------------------------------------------

  async function saveOrg(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (
      !profile?.organization_id
    ) {
      setToast({
        msg:
          "No organization is linked to this account.",
        type: "error",
      });

      return;
    }

    setSubmitting(true);
    setToast(null);

    try {
      const name =
        orgForm.name.trim();

      if (!name) {
        throw new Error(
          "Organization name is required."
        );
      }

      const {
        error,
      } = await supabase
        .from("organizations")
        .update({
          name,
        })
        .eq(
          "id",
          profile.organization_id
        );

      if (error) {
        throw new Error(
          error.message
        );
      }

      setToast({
        msg:
          "Organization updated!",
        type: "success",
      });
    } catch (err) {
      setToast({
        msg:
          err instanceof Error
            ? err.message
            : "Unable to update organization.",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  // ------------------------------------------------------------
  // Change password
  // ------------------------------------------------------------

  async function changePassword(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setToast(null);

    if (
      passwordForm.password.length <
      6
    ) {
      setToast({
        msg:
          "Password must be at least 6 characters.",
        type: "error",
      });

      return;
    }

    if (
      passwordForm.password !==
      passwordForm.confirm
    ) {
      setToast({
        msg:
          "Passwords do not match.",
        type: "error",
      });

      return;
    }

    setSubmitting(true);

    try {
      const {
        error,
      } =
        await supabase.auth.updateUser(
          {
            password:
              passwordForm.password,
          }
        );

      if (error) {
        throw new Error(
          error.message
        );
      }

      setToast({
        msg:
          "Password updated successfully.",
        type: "success",
      });

      setPasswordForm({
        password: "",
        confirm: "",
      });
    } catch (err) {
      setToast({
        msg:
          err instanceof Error
            ? err.message
            : "Unable to update password.",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  // ------------------------------------------------------------
  // Confirm role change
  // ------------------------------------------------------------

  async function confirmRoleChange() {
    if (!user || !profile) {
      return;
    }

    if (
      selectedRole ===
      profile.role
    ) {
      setShowRoleModal(
        false
      );

      return;
    }

    setSubmitting(true);
    setRoleConfirmError("");

    try {
      const {
        error,
      } =
        await supabase
          .from("profiles")
          .update({
            role:
              selectedRole,

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            user.id
          );

      if (error) {
        throw new Error(
          error.message
        );
      }

      await refreshProfile();

      setShowRoleModal(
        false
      );

      setToast({
        msg: `Role changed to ${
          ROLES.find(
            (item) =>
              item.value ===
              selectedRole
          )?.label ||
          selectedRole
        }.`,
        type: "success",
      });
    } catch (err) {
      setRoleConfirmError(
        err instanceof Error
          ? err.message
          : "Unable to change role."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ------------------------------------------------------------
  // Tabs
  // ------------------------------------------------------------

  const tabs: {
    id: SettingsTab;
    label: string;
    icon: React.ReactNode;
  }[] = [
    { id: "profile", label: "Profile", icon: <User size={15} /> },
    { id: "security", label: "Security", icon: <Shield size={15} /> },
  ];

  return (
    <div className="animate-fade-in max-w-2xl">
      <PageHeader
        title="Settings"
        subtitle="Manage your account and organization"
      />

      {/* ====================================================== */}
      {/* TABS                                                   */}
      {/* ====================================================== */}

      <div className="flex gap-1 bg-navy-800 border border-navy-700 rounded-xl p-1 mb-6">
        {tabs.map(
          (tabItem) => (
            <button
              key={
                tabItem.id
              }
              type="button"
              onClick={() =>
                setTab(
                  tabItem.id
                )
              }
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold font-display transition-all ${
                tab ===
                tabItem.id
                  ? "bg-navy-700 text-white"
                  : "text-navy-400 hover:text-navy-200"
              }`}
            >
              {
                tabItem.icon
              }

              {
                tabItem.label
              }
            </button>
          )
        )}
      </div>

      {/* ====================================================== */}
      {/* PROFILE                                                 */}
      {/* ====================================================== */}

      {tab ===
        "profile" && (
        <Card>
          <h2 className="font-display font-bold text-white mb-5 flex items-center gap-2">
            <User size={18} />
            Profile
          </h2>

          <form
            onSubmit={
              saveProfile
            }
            className="flex flex-col gap-4"
          >
            {/* Profile header */}

            <div className="flex items-center gap-4 mb-2">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center">
                <span className="text-xl font-bold text-white">
                  {(
                    profile?.full_name ||
                    "U"
                  )
                    .trim()
                    .charAt(
                      0
                    )
                    .toUpperCase()}
                </span>
              </div>

              <div className="min-w-0">
                <div className="font-display font-semibold text-white truncate">
                  {profile?.full_name ||
                    "User"}
                </div>

                <div className="text-xs text-blue-400 font-mono">
                  {
                    profile?.role
                  }
                </div>
              </div>
            </div>

            {/* Full name */}

            <Input
              label="Full name"
              disabled={profile?.role === "TENANT"}
              value={
                profileForm.full_name
              }
              onChange={(
                e
              ) =>
                setProfileForm(
                  (
                    current
                  ) => ({
                    ...current,
                    full_name:
                      e.target.value,
                  })
                )
              }
            />

            {/* Email */}

            <div className="relative">
              {/*<Mail
                size={16}
                className="absolute left-3 top-[35px] text-navy-500 pointer-events-none"
              />*/}
              <Input
                label="Email address"
                type="email"
                disabled={profile?.role === "TENANT"}
                value={
                  profileForm.email
                }
                onChange={(
                  e
                ) =>
                  setProfileForm(
                    (
                      current
                    ) => ({
                      ...current,
                      email:
                        e.target.value,
                    })
                  )
                }
              />
            </div>

            {/*<p className="text-[11px] text-navy-600 -mt-2">
              This email can be used to
              sign in to your RENFLIX
              account.
            </p>*/}

            {/* Phone */}

            <div className="relative">
              {/*<Phone
                size={16}
                className="absolute left-3 top-[35px] text-navy-500 pointer-events-none"
              />*/}

              <Input
                label="Phone number"
                type="tel"
                inputMode="tel"
                disabled={profile?.role === "TENANT"}
                value={
                  profileForm.phone
                }
                onChange={(
                  e
                ) =>
                  setProfileForm(
                    (
                      current
                    ) => ({
                      ...current,
                      phone:
                        e.target.value,
                    })
                  )
                }
              />
            </div>

            {/*<p className="text-[11px] text-navy-600 -mt-2">
              Indian mobile numbers are
              stored as +91XXXXXXXXXX.
              This number can also be
              used to sign in.
            </p>*/}

            {/* Role */}

            {/*<div className="pt-2 border-t border-navy-700">
              <button
                type="button"
                onClick={() => {
                  setSelectedRole(
                    (profile?.role ||
                      "OWNER") as UserRole
                  );

                  setRoleConfirmError(
                    ""
                  );

                  setShowRoleModal(
                    true
                  );
                }}
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                Change role
              </button>
            </div>*/}

            {/* Save */}

            {profile?.role !== "TENANT" && <Button
              type="submit"
              loading={
                submitting
              }
              className="self-start"
            >
              Save changes
            </Button>}
            {profile?.role === "TENANT" && (
              <p className="text-xs text-navy-500">Your name, email and phone are managed by the property owner. Emergency contact details can be changed from Dashboard.</p>
            )}
          </form>
        </Card>
      )}

      {/* ====================================================== */}
      {/* ROLE MODAL                                              */}
      {/* ====================================================== */}

      {showRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-navy-800 border border-navy-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-display font-bold text-white mb-2">
              Change your role
            </h3>

            <p className="text-sm text-navy-400 mb-4">
              Select a new role. This
              will update your dashboard
              experience.
            </p>

            <Select
              value={
                selectedRole
              }
              onChange={(
                e
              ) =>
                setSelectedRole(
                  e.target
                    .value as UserRole
                )
              }
              options={ROLES.map(
                (
                  item
                ) => ({
                  value:
                    item.value,
                  label:
                    item.label,
                })
              )}
              className="mb-4"
            />

            {roleConfirmError && (
              <p className="text-xs text-red-400 mb-2">
                {
                  roleConfirmError
                }
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() =>
                  setShowRoleModal(
                    false
                  )
                }
                className="px-4 py-2 rounded-lg bg-navy-700 text-navy-300 hover:bg-navy-600 transition-colors text-sm"
              >
                Cancel
              </button>

              <Button
                type="button"
                onClick={
                  confirmRoleChange
                }
                loading={
                  submitting
                }
                disabled={
                  selectedRole ===
                  profile?.role
                }
                className="px-4 py-2 rounded-lg text-sm"
              >
                Confirm change
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================== */}
      {/* ORGANIZATION                                            */}
      {/* ====================================================== */}

      {tab === "org" && (
        <Card>
          <h2 className="font-display font-bold text-white mb-4 flex items-center gap-2">
            <Building2
              size={18}
            />
            Organization
          </h2>

          {!profile?.organization_id ? (
            <div className="text-sm text-navy-500 py-4 text-center">
              No organization linked
              to your account.
            </div>
          ) : (
            <form
              onSubmit={
                saveOrg
              }
              className="flex flex-col gap-4"
            >
              <Input
                label="Organization name"
                value={
                  orgForm.name
                }
                onChange={(
                  e
                ) =>
                  setOrgForm({
                    name:
                      e.target.value,
                  })
                }
              />

              <Button
                type="submit"
                loading={
                  submitting
                }
                className="self-start"
              >
                Save
              </Button>
            </form>
          )}
        </Card>
      )}

      {/* ====================================================== */}
      {/* SECURITY                                                */}
      {/* ====================================================== */}

      {tab ===
        "security" && (
        <Card>
          <h2 className="font-display font-bold text-white mb-4 flex items-center gap-2">
            <Shield
              size={18}
            />
            Security
          </h2>

          <form
            onSubmit={
              changePassword
            }
            className="flex flex-col gap-4"
          >
            <Input
              label="New password"
              type="password"
              value={
                passwordForm.password
              }
              onChange={(
                e
              ) =>
                setPasswordForm(
                  (
                    current
                  ) => ({
                    ...current,
                    password:
                      e.target.value,
                  })
                )
              }
              hint="Minimum 6 characters"
            />

            <Input
              label="Confirm password"
              type="password"
              value={
                passwordForm.confirm
              }
              onChange={(
                e
              ) =>
                setPasswordForm(
                  (
                    current
                  ) => ({
                    ...current,
                    confirm:
                      e.target.value,
                  })
                )
              }
            />

            <Button
              type="submit"
              loading={
                submitting
              }
              className="self-start"
            >
              Change password
            </Button>
          </form>
        </Card>
      )}

      {tab === "profile" && (
        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between gap-4 py-1">
              <div><h3 className="font-display font-bold text-white">Device notifications</h3><p className="text-xs text-navy-500 mt-1">Show RENFLIX alerts as device notifications.</p></div>
              <Button size="sm" variant={deviceNotifications ? "secondary" : "primary"} onClick={toggleDeviceNotifications}>{deviceNotifications ? "Enabled" : "Enable"}</Button>
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between gap-4 py-1">
              <div><h3 className="font-display font-bold text-white">Appearance</h3><p className="text-xs text-navy-500 mt-1">Choose the RENFLIX theme.</p></div>
              <div className="flex gap-2"><Button size="sm" variant={theme === "light" ? "primary" : "secondary"} onClick={() => setTheme("light")}>Light</Button><Button size="sm" variant={theme === "dark" ? "primary" : "secondary"} onClick={() => setTheme("dark")}>Dark</Button></div>
            </div>
          </Card>
          <Card className="border-red-500/20">
            <div className="flex items-center justify-between gap-4 py-1">
              {/*<div><h3 className="font-display font-bold text-white">Sign out</h3><p className="text-xs text-navy-500 mt-1">Sign out of this RENFLIX account on this device.</p></div>*/}
              <Button variant="ghost" type="button" className="text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={async () => { if (window.confirm("Are you sure you want to sign out?")) { await supabase.auth.signOut(); navigate("/login", { replace: true }); } }}><LogOut size={15} /> Sign out</Button>
            </div>
          </Card>
        </div>
      )}

      {/* ====================================================== */}
      {/* TOAST                                                   */}
      {/* ====================================================== */}

      {toast && (
        <Toast
          message={
            toast.msg
          }
          type={
            toast.type
          }
          onClose={() =>
            setToast(null)
          }
        />
      )}
    </div>
  );
}