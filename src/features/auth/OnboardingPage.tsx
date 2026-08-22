import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Home,
  Check,
  ArrowRight,
  ArrowLeft,
  X,
} from "lucide-react";

import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { ensureDbReady } from "../../lib/setupDb";

import {
  getSignupIdentifierType,
  clearSignupIdentifierType,
  isEmailIdentifier,
  normalizeIndianPhone,
} from "../../lib/auth";

type Step = 1 | 2;

type SignupIdentifierType =
  | "email"
  | "phone"
  | null;

export default function OnboardingPage() {
  const {
    user,
    profile,
    loading,
    refreshProfile,
  } = useAuth();

  const navigate = useNavigate();

  const [step, setStep] =
    useState<Step>(1);

  const [done, setDone] =
    useState(false);

  const [direction, setDirection] =
    useState<
      "forward" | "back"
    >("forward");

  const role = "OWNER";

  const [fullName, setFullName] =
    useState(
      profile?.full_name ||
        ""
    );

  const [email, setEmail] =
    useState(
      profile?.email ||
        user?.email ||
        ""
    );

  const [phone, setPhone] =
    useState(
      profile?.phone ||
        user?.phone ||
        ""
    );

  const [orgName, setOrgName] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [setupReady, setSetupReady] =
    useState(false);

  const [
    signupIdentifierType,
    setSignupIdentifierType,
  ] =
    useState<SignupIdentifierType>(
      null
    );

  // ------------------------------------------------------------
  // Organization requirement
  // ------------------------------------------------------------

  const needsOrg = true;

  const totalSteps = 2;

  // ------------------------------------------------------------
  // Resolve signup identifier type
  // ------------------------------------------------------------

  useEffect(() => {
    /*
     * Do nothing while Auth is still initializing.
     */
    if (loading) {
      return;
    }

    const storedType =
      getSignupIdentifierType();

    if (
      storedType === "email" ||
      storedType === "phone"
    ) {
      setSignupIdentifierType(
        storedType
      );

      if (
        storedType === "email"
      ) {
        setPhone(
          profile?.phone ||
            user?.phone ||
            ""
        );
      }

      if (
        storedType === "phone"
      ) {
        setEmail(
          profile?.email ||
            user?.email ||
            ""
        );
      }

      return;
    }

    /*
     * If sessionStorage was lost because the user refreshed,
     * determine the signup origin from the actual Auth user.
     */
    if (
      user?.email &&
      !user?.phone
    ) {
      setSignupIdentifierType(
        "email"
      );

      return;
    }

    if (
      user?.phone &&
      !user?.email
    ) {
      setSignupIdentifierType(
        "phone"
      );

      return;
    }

    /*
     * Existing account already has both identifiers, or this is
     * an account created through another authentication provider.
     */
    setSignupIdentifierType(
      null
    );
  }, [
    loading,
    user?.email,
    user?.phone,
    profile?.email,
    profile?.phone,
  ]);

  // ------------------------------------------------------------
  // Keep form values synchronized with auth/profile
  // ------------------------------------------------------------

  useEffect(() => {
    if (profile?.full_name) {
      setFullName(
        profile.full_name
      );
    }

    if (
      profile?.email ||
      user?.email
    ) {
      setEmail(
        profile?.email ||
          user?.email ||
          ""
      );
    }

    if (
      profile?.phone ||
      user?.phone
    ) {
      setPhone(
        profile?.phone ||
          user?.phone ||
          ""
      );
    }
  }, [
    profile?.full_name,
    profile?.email,
    profile?.phone,
    user?.email,
    user?.phone,
  ]);

  // ------------------------------------------------------------
  // Database availability
  // ------------------------------------------------------------

  useEffect(() => {
    let mounted = true;

    async function checkDatabase() {
      const result =
        await ensureDbReady();

      if (!mounted) {
        return;
      }

      setSetupReady(
        result.ok
      );

      if (!result.ok) {
        setError(
          result.message
        );
      }
    }

    checkDatabase();

    return () => {
      mounted = false;
    };
  }, []);

  // ------------------------------------------------------------
  // Authentication guard
  // ------------------------------------------------------------

  useEffect(() => {
    /*
     * Never redirect while Auth is initializing.
     */
    if (loading) {
      return;
    }

    /*
     * Once Auth has finished loading, an onboarding page requires
     * an authenticated user.
     */
    if (!user) {
      navigate(
        "/login",
        {
          replace: true,
        }
      );
    }
  }, [
    loading,
    user,
    navigate,
  ]);

  // ------------------------------------------------------------
  // Navigation
  // ------------------------------------------------------------

  function goNext() {
    setError("");
    setDirection(
      "forward"
    );

    setStep(
      (current) =>
        Math.min(
          current + 1,
          totalSteps
        ) as Step
    );
  }

  function goBack() {
    setError("");
    setDirection(
      "back"
    );

    setStep(
      (current) =>
        Math.max(
          current - 1,
          1
        ) as Step
    );
  }

  // ------------------------------------------------------------
  // Cancel onboarding
  // ------------------------------------------------------------

  async function handleCancel() {
    clearSignupIdentifierType();

    await supabase.auth.signOut();

    navigate(
      "/signup",
      {
        replace: true,
      }
    );
  }

  // ------------------------------------------------------------
  // Email validation
  // ------------------------------------------------------------

  function validateEmail(
    value: string
  ): boolean {
    return isEmailIdentifier(
      value.trim()
    );
  }

  // ------------------------------------------------------------
  // Phone validation
  // ------------------------------------------------------------

  function validatePhone(
    value: string
  ): boolean {
    try {
      normalizeIndianPhone(
        value
      );

      return true;
    } catch {
      return false;
    }
  }

  // ------------------------------------------------------------
  // Finish onboarding
  // ------------------------------------------------------------

  async function handleFinish() {
    /*
     * Do not allow submission while Auth is still loading.
     */
    if (loading) {
      return;
    }

    if (!user) {
      setError(
        "Your session has expired. Please sign in again."
      );

      return;
    }

    setError("");

    // ----------------------------------------------------------
    // Full name
    // ----------------------------------------------------------

    const trimmedFullName =
      fullName.trim();

    if (!trimmedFullName) {
      setError(
        "Please enter your full name."
      );

      return;
    }

    // ----------------------------------------------------------
    // Resolve email / phone
    // ----------------------------------------------------------

    let normalizedEmail:
      | string
      | null =
      email.trim()
        ? email.trim().toLowerCase()
        : null;

    let normalizedPhone:
      | string
      | null =
      phone.trim()
        ? phone.trim()
        : null;

    // ----------------------------------------------------------
    // Email-first signup
    // ----------------------------------------------------------

    if (
      signupIdentifierType ===
      "email"
    ) {
      if (!user.email) {
        setError(
          "Your email could not be found. Please sign in again."
        );

        return;
      }

      if (!phone.trim()) {
        setError(
          "Please enter your phone number to complete your account."
        );

        return;
      }

      if (
        !validatePhone(
          phone
        )
      ) {
        setError(
          "Please enter a valid 10-digit Indian mobile number."
        );

        return;
      }

      normalizedEmail =
        user.email
          .trim()
          .toLowerCase();

      normalizedPhone =
        normalizeIndianPhone(
          phone
        );
    }

    // ----------------------------------------------------------
    // Phone-first signup
    // ----------------------------------------------------------

    if (
      signupIdentifierType ===
      "phone"
    ) {
      if (!user.phone) {
        setError(
          "Your phone number could not be found. Please sign in again."
        );

        return;
      }

      if (!email.trim()) {
        setError(
          "Please enter your email address to complete your account."
        );

        return;
      }

      if (
        !validateEmail(
          email
        )
      ) {
        setError(
          "Please enter a valid email address."
        );

        return;
      }

      normalizedEmail =
        email
          .trim()
          .toLowerCase();

      normalizedPhone =
        normalizeIndianPhone(
          user.phone
        );
    }

    // ----------------------------------------------------------
    // Existing/OAuth account
    // ----------------------------------------------------------

    if (
      signupIdentifierType ===
      null
    ) {
      if (
        !normalizedEmail &&
        !normalizedPhone
      ) {
        setError(
          "Please provide your email address or phone number."
        );

        return;
      }

      if (
        !normalizedEmail &&
        normalizedPhone
      ) {
        if (
          !validateEmail(
            email
          )
        ) {
          setError(
            "Please enter a valid email address."
          );

          return;
        }

        normalizedEmail =
          email
            .trim()
            .toLowerCase();
      }

      if (
        normalizedEmail &&
        !normalizedPhone
      ) {
        if (
          !validatePhone(
            phone
          )
        ) {
          setError(
            "Please enter a valid 10-digit Indian mobile number."
          );

          return;
        }

        normalizedPhone =
          normalizeIndianPhone(
            phone
          );
      }
    }

    /*
     * A completed RENFLIX profile must contain BOTH identifiers.
     */
    if (
      !normalizedEmail ||
      !normalizedPhone
    ) {
      setError(
        "Both email address and phone number are required to complete your RENFLIX account."
      );

      return;
    }

    setSubmitting(true);

    try {
      // --------------------------------------------------------
      // Verify database
      // --------------------------------------------------------

      if (!setupReady) {
        const result =
          await ensureDbReady();

        if (!result.ok) {
          throw new Error(
            result.message
          );
        }

        setSetupReady(
          true
        );
      }

      // --------------------------------------------------------
      // Update Supabase Auth
      // --------------------------------------------------------

      const authUpdates: {
        email?: string;
        phone?: string;
      } = {};

      const currentAuthEmail =
        (
          user.email ||
          ""
        )
          .trim()
          .toLowerCase();

      const currentAuthPhone =
        user.phone ||
        "";

      if (
        normalizedEmail !==
        currentAuthEmail
      ) {
        authUpdates.email =
          normalizedEmail;
      }

      if (
        normalizedPhone !==
        currentAuthPhone
      ) {
        authUpdates.phone =
          normalizedPhone;
      }

      if (
        Object.keys(
          authUpdates
        ).length > 0
      ) {
        const {
          data:
            updatedAuth,
          error:
            authError,
        } =
          await supabase.auth.updateUser(
            authUpdates
          );

        if (authError) {
          throw new Error(
            authError.message
          );
        }

        /*
         * Use returned Auth values as final values.
         */
        if (
          updatedAuth.user
        ) {
          if (
            updatedAuth
              .user
              .email
          ) {
            normalizedEmail =
              updatedAuth
                .user
                .email
                .trim()
                .toLowerCase();
          }

          if (
            updatedAuth
              .user
              .phone
          ) {
            normalizedPhone =
              updatedAuth
                .user
                .phone;
          }
        }
      }

      // --------------------------------------------------------
      // Organization
      // --------------------------------------------------------

      let orgId:
        | string
        | null =
        profile?.organization_id ||
        null;

      if (
        needsOrg &&
        orgName.trim()
      ) {
        const {
          data:
            existingOrg,
          error:
            existingOrgError,
        } =
          await supabase
            .from(
              "organizations"
            )
            .select(
              "id"
            )
            .eq(
              "owner_id",
              user.id
            )
            .limit(1)
            .maybeSingle();

        if (
          existingOrgError
        ) {
          throw new Error(
            existingOrgError.message
          );
        }

        if (
          existingOrg?.id
        ) {
          orgId =
            existingOrg.id;
        } else {
          const {
            data:
              orgData,
            error:
              orgError,
          } =
            await supabase
              .from(
                "organizations"
              )
              .insert({
                name:
                  orgName.trim(),
                owner_id:
                  user.id,
              })
              .select(
                "id"
              )
              .single();

          if (orgError) {
            throw new Error(
              orgError.message
            );
          }

          orgId =
            orgData?.id ||
            null;
        }
      }

      // --------------------------------------------------------
      // Find existing profile
      // --------------------------------------------------------

      const {
        data:
          existingProfile,
        error:
          existingProfileError,
      } =
        await supabase
          .from(
            "profiles"
          )
          .select(
            "id"
          )
          .eq(
            "id",
            user.id
          )
          .maybeSingle();

      if (
        existingProfileError
      ) {
        throw new Error(
          existingProfileError.message
        );
      }

      // --------------------------------------------------------
      // Save profile
      // --------------------------------------------------------

      const profilePayload = {
        id:
          user.id,

        email:
          normalizedEmail,

        phone:
          normalizedPhone,

        full_name:
          trimmedFullName,

        role,

        organization_id:
          orgId,
      };

      if (
        existingProfile
      ) {
        const {
          error:
            profileUpdateError,
        } =
          await supabase
            .from(
              "profiles"
            )
            .update({
              email:
                profilePayload.email,

              phone:
                profilePayload.phone,

              full_name:
                profilePayload.full_name,

              role:
                profilePayload.role,

              organization_id:
                profilePayload.organization_id,

              updated_at:
                new Date().toISOString(),
            })
            .eq(
              "id",
              user.id
            );

        if (
          profileUpdateError
        ) {
          throw new Error(
            profileUpdateError.message
          );
        }
      } else {
        const {
          error:
            profileInsertError,
        } =
          await supabase
            .from(
              "profiles"
            )
            .insert(
              profilePayload
            );

        if (
          profileInsertError
        ) {
          throw new Error(
            profileInsertError.message
          );
        }
      }

      // --------------------------------------------------------
      // Refresh Auth/profile state
      // --------------------------------------------------------

      await refreshProfile();

      // --------------------------------------------------------
      // Completed
      // --------------------------------------------------------

      clearSignupIdentifierType();

      setDone(true);
      setSubmitting(false);

      window.setTimeout(
        () => {
          navigate(
            "/dashboard",
            {
              replace: true,
            }
          );
        },
        1200
      );
    } catch (err) {
      console.error(
        "RENFLIX onboarding error:",
        err
      );

      setSubmitting(false);
      setDone(false);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    }
  }

  // ------------------------------------------------------------
  // Show loading screen while Auth initializes
  // ------------------------------------------------------------

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-navy-700 border-t-blue-500 animate-spin mx-auto mb-4" />

          <div className="font-display font-semibold text-white">
            Checking your account…
          </div>

          <div className="text-xs text-navy-500 mt-1">
            Preparing your RENFLIX profile
          </div>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------
  // No authenticated user
  // ------------------------------------------------------------

  if (!user) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="text-center">
          <div className="font-display font-semibold text-white mb-2">
            Redirecting to sign in…
          </div>

          <div className="text-xs text-navy-500">
            Your session is not available.
          </div>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------
  // Animation
  // ------------------------------------------------------------

  const animClass =
    direction ===
    "forward"
      ? "animate-slide-in-right"
      : "animate-slide-in-left";

  // ------------------------------------------------------------
  // Identifier information
  // ------------------------------------------------------------

  const identifierDescription =
    signupIdentifierType ===
    "email"
      ? "You signed up with email. Add your phone number to complete your account."
      : signupIdentifierType ===
          "phone"
        ? "You signed up with phone. Add your email address to complete your account."
        : "Complete your contact details so you can use both email and phone to sign in.";

  // ------------------------------------------------------------
  // UI
  // ------------------------------------------------------------

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center p-6">
      {/* Background grid */}

      <div
        className="fixed inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at center, rgba(59,130,246,0.8) 1px, transparent 1px)",
          backgroundSize:
            "24px 24px",
        }}
      />

      {/* Cancel */}

      <button
        type="button"
        onClick={
          handleCancel
        }
        className="fixed top-6 right-6 z-50 flex items-center gap-1.5 text-sm text-navy-400 hover:text-white transition-colors bg-navy-900/80 backdrop-blur-sm rounded-full px-4 py-2 border border-white/10"
      >
        <X size={16} />
        Cancel
      </button>

      <div className="relative w-full max-w-lg">
        {/* Logo */}

        <div className="flex items-center gap-2.5 mb-10 justify-center">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg animate-pulse-glow">
            <Home
              size={20}
              className="text-white"
            />
          </div>

          <div>
            <div className="font-display text-xl font-extrabold gradient-text leading-none">
              RENFLIX
            </div>

            <div className="text-[9px] text-navy-500 font-mono uppercase tracking-widest">
              Property OS
            </div>
          </div>
        </div>

        {/* Progress */}

        <div className="flex items-center gap-2 mb-8">
          {[1, 2].map(
            (s) => (
              <div
                key={s}
                className="flex-1 flex items-center gap-2"
              >
                <div
                  className={`h-1 rounded-full flex-1 transition-all duration-500 ${
                    step >= s
                      ? "bg-blue-500"
                      : "bg-navy-700"
                  }`}
                />

                {s === 2 ? null : (
                  <div
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      step >
                      s
                        ? "bg-blue-500"
                        : "bg-navy-700"
                    }`}
                  />
                )}
              </div>
            )
          )}
        </div>

        {/* ================================================== */}
        {/* STEP 1 — PROFILE                                  */}
        {/* ================================================== */}

        {step === 1 &&
          !submitting &&
          !done && (
            <div
              key="step1"
              className={animClass}
            >
              <h2 className="font-display text-2xl font-bold text-white text-center mb-1.5">
                Set up your profile
              </h2>

              <p className="text-navy-400 text-sm text-center mb-4">
                Almost there — just a few details to get started
              </p>

              <div className="bg-blue-600/10 border border-blue-500/20 rounded-xl px-4 py-3 mb-5">
                <div className="text-xs font-semibold text-blue-300 mb-1">
                  Complete your contact details
                </div>

                <div className="text-xs text-navy-400 leading-relaxed">
                  {
                    identifierDescription
                  }
                </div>
              </div>

              <div className="bg-navy-800 border border-navy-700 rounded-2xl p-6 mb-5 stagger-children">
                {/* Full name */}

                <div className="flex flex-col gap-1 mb-4">
                  <label className="text-xs font-semibold text-navy-300 font-display uppercase tracking-wider">
                    Your full name
                  </label>

                  <input
                    autoFocus
                    type="text"
                    autoComplete="name"
                    className="w-full bg-navy-900 border border-navy-600 rounded-xl px-4 py-3 text-sm text-navy-100 placeholder-navy-600 focus:outline-none focus:ring-2 focus:ring-blue-electric focus:border-transparent transition-all"
                    placeholder="Rajan Sharma"
                    value={
                      fullName
                    }
                    onChange={(
                      e
                    ) =>
                      setFullName(
                        e.target.value
                      )
                    }
                  />
                </div>

                {/* Email */}

                <div className="flex flex-col gap-1 mb-4">
                  <label className="text-xs font-semibold text-navy-300 font-display uppercase tracking-wider">
                    Email address

                    {signupIdentifierType ===
                    "phone" ? (
                      <span className="text-red-400 ml-1">
                        *
                      </span>
                    ) : (
                      <span className="text-navy-600 normal-case font-normal ml-1">
                        (already linked)
                      </span>
                    )}
                  </label>

                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={
                      email
                    }
                    disabled={
                      signupIdentifierType ===
                      "email"
                    }
                    onChange={(
                      e
                    ) => {
                      setEmail(
                        e.target.value
                      );

                      setError(
                        ""
                      );
                    }}
                    className={`w-full bg-navy-900 border border-navy-600 rounded-xl px-4 py-3 text-sm text-navy-100 placeholder-navy-600 focus:outline-none focus:ring-2 focus:ring-blue-electric focus:border-transparent transition-all ${
                      signupIdentifierType ===
                      "email"
                        ? "opacity-60 cursor-not-allowed"
                        : ""
                    }`}
                  />

                  {signupIdentifierType ===
                    "email" && (
                    <p className="text-[11px] text-navy-600 mt-1">
                      This is the email you used to create the account.
                    </p>
                  )}
                </div>

                {/* Phone */}

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-navy-300 font-display uppercase tracking-wider">
                    Phone number

                    {signupIdentifierType ===
                    "email" ? (
                      <span className="text-red-400 ml-1">
                        *
                      </span>
                    ) : (
                      <span className="text-navy-600 normal-case font-normal ml-1">
                        (already linked)
                      </span>
                    )}
                  </label>

                  <div className="flex">
                    <div className="flex items-center bg-navy-900 border border-r-0 border-navy-600 rounded-l-xl px-3 text-sm text-navy-300">
                      +91
                    </div>

                    <input
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      placeholder="98765 43210"
                      value={
                        phone.startsWith(
                          "+91"
                        )
                          ? phone.slice(
                              3
                            )
                          : phone
                      }
                      disabled={
                        signupIdentifierType ===
                        "phone"
                      }
                      onChange={(
                        e
                      ) => {
                        const digits =
                          e.target.value.replace(
                            /\D/g,
                            ""
                          );

                        setPhone(
                          digits
                            ? `+91${digits.slice(
                                0,
                                10
                              )}`
                            : ""
                        );

                        setError(
                          ""
                        );
                      }}
                      className={`w-full bg-navy-900 border border-navy-600 rounded-r-xl px-4 py-3 text-sm text-navy-100 placeholder-navy-600 focus:outline-none focus:ring-2 focus:ring-blue-electric focus:border-transparent transition-all ${
                        signupIdentifierType ===
                        "phone"
                          ? "opacity-60 cursor-not-allowed"
                          : ""
                      }`}
                    />
                  </div>

                  {signupIdentifierType ===
                    "phone" && (
                    <p className="text-[11px] text-navy-600 mt-1">
                      This is the phone number you used to create the account.
                    </p>
                  )}
                </div>
              </div>

              {error && (
                <div className="bg-red-900/30 border border-red-700/50 rounded-xl px-4 py-3 text-sm text-red-400 mb-4 animate-fade-in-fast">
                  {
                    error
                  }
                </div>
              )}

              <div className="flex gap-3">

                <button
                  type="button"
                  onClick={goNext}
                  disabled={
                    !fullName.trim()
                  }
                  className="btn-primary flex-1 py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
                >
                  <>
                    Next
                    <ArrowRight size={16} />
                  </>
                </button>
              </div>
            </div>
          )}

        {/* ================================================== */}
        {/* STEP 2 — ORGANIZATION                             */}
        {/* ================================================== */}

        {step === 2 &&
          !submitting &&
          !done && (
            <div
              key="step2"
              className={
                animClass
              }
            >
              <h2 className="font-display text-2xl font-bold text-white text-center mb-1.5">
                Name your organization
              </h2>

              <p className="text-navy-400 text-sm text-center mb-6">
                This is how your properties and data will be organized
              </p>

              <div className="bg-navy-800 border border-navy-700 rounded-2xl p-6 mb-5">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-navy-300 font-display uppercase tracking-wider">
                    Organization / company name
                  </label>

                  <input
                    autoFocus
                    type="text"
                    className="w-full bg-navy-900 border border-navy-600 rounded-xl px-4 py-3 text-sm text-navy-100 placeholder-navy-600 focus:outline-none focus:ring-2 focus:ring-blue-electric focus:border-transparent transition-all"
                    placeholder="e.g., Sharma Properties"
                    value={
                      orgName
                    }
                    onChange={(
                      e
                    ) =>
                      setOrgName(
                        e.target.value
                      )
                    }
                    onKeyDown={(
                      e
                    ) => {
                      if (
                        e.key ===
                        "Enter"
                      ) {
                        e.preventDefault();
                        handleFinish();
                      }
                    }}
                  />

                  <p className="text-xs text-navy-600 mt-1.5">
                    You can rename this later in Settings
                  </p>
                </div>
              </div>

              {error && (
                <div className="bg-red-900/30 border border-red-700/50 rounded-xl px-4 py-3 text-sm text-red-400 mb-4 animate-fade-in-fast">
                  {
                    error
                  }
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={
                    goBack
                  }
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-navy-800 border border-navy-700 text-navy-300 hover:text-white hover:bg-navy-700 transition-all font-display font-semibold text-sm"
                >
                  <ArrowLeft
                    size={
                      16
                    }
                  />
                  Back
                </button>

                <button
                  type="button"
                  onClick={
                    handleFinish
                  }
                  disabled={
                    submitting
                  }
                  className="btn-primary flex-1 py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Get started
                  <ArrowRight
                    size={
                      16
                    }
                  />
                </button>
              </div>
            </div>
          )}

        {/* ================================================== */}
        {/* SUBMITTING                                        */}
        {/* ================================================== */}

        {submitting && (
          <div
            key="submitting"
            className="animate-fade-in flex flex-col items-center py-12 gap-6"
          >
            <div className="relative w-20 h-20">
              <div className="w-20 h-20 rounded-full border-4 border-navy-700" />

              <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-transparent border-t-blue-500 animate-spin" />
            </div>

            <div className="text-center">
              <div className="font-display font-bold text-white text-lg">
                Setting up your account…
              </div>

              <div className="text-navy-500 text-sm mt-1">
                Creating your workspace on RENFLIX
              </div>
            </div>
          </div>
        )}

        {/* ================================================== */}
        {/* SUCCESS                                            */}
        {/* ================================================== */}

        {done && (
          <div
            key="success"
            className="animate-scale-in flex flex-col items-center py-12 gap-5"
          >
            <div className="w-20 h-20 rounded-full bg-emerald-600/20 border-2 border-emerald-500 flex items-center justify-center">
              <Check
                size={36}
                className="text-emerald-400"
                strokeWidth={2.5}
              />
            </div>

            <div className="text-center">
              <div className="font-display font-bold text-white text-2xl mb-1">
                {"You're all set" +
                  (fullName
                    ? ", " +
                      fullName.split(
                        " "
                      )[0]
                    : "") +
                  "!"}
              </div>

              <div className="text-navy-400 text-sm">
                Taking you to your dashboard…
              </div>
            </div>

            <div className="w-40 h-1 bg-navy-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full progress-bar-fill" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}