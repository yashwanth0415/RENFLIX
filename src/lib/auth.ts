import { supabase } from "./supabase";

/**
 * Determines whether a value is a valid email address.
 */
export function isEmailIdentifier(
  value: string
): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value.trim()
  );
}

/**
 * Determines whether a value looks like a phone number.
 *
 * This is only used to distinguish numeric input from arbitrary
 * text. Full Indian phone validation happens in
 * normalizeIndianPhone().
 */
function looksLikePhoneIdentifier(
  value: string
): boolean {
  const cleaned = value.replace(
    /[\s\-().+]/g,
    ""
  );

  return /^\d+$/.test(
    cleaned
  );
}

/**
 * Removes common separators from phone numbers.
 */
function cleanPhone(
  value: string
): string {
  return value.replace(
    /[\s\-().]/g,
    ""
  );
}

/**
 * Converts an Indian mobile number to E.164 format.
 *
 * Examples:
 *
 * 9876543210
 * +919876543210
 * 919876543210
 * +91 98765 43210
 * +91-98765-43210
 *
 * Result:
 *
 * +919876543210
 */
export function normalizeIndianPhone(
  value: string
): string {
  let phone =
    cleanPhone(value);

  if (
    phone.startsWith("+91")
  ) {
    phone = phone.slice(3);
  } else if (
    phone.startsWith("91") &&
    phone.length === 12
  ) {
    phone = phone.slice(2);
  }

  if (
    !/^\d{10}$/.test(phone)
  ) {
    throw new Error(
      "Enter a valid 10-digit Indian phone number."
    );
  }

  if (
    !/^[6-9]\d{9}$/.test(
      phone
    )
  ) {
    throw new Error(
      "Enter a valid Indian mobile number."
    );
  }

  return `+91${phone}`;
}

/**
 * Automatically determines whether the common authentication
 * field contains an email address or an Indian phone number.
 */
export function normalizeIdentifier(
  value: string
): {
  type: "email" | "phone";
  value: string;
} {
  const identifier =
    value.trim();

  if (!identifier) {
    throw new Error(
      "Email or phone number is required."
    );
  }

  // ----------------------------------------------------------
  // EMAIL
  // ----------------------------------------------------------

  if (
    isEmailIdentifier(
      identifier
    )
  ) {
    return {
      type: "email",
      value:
        identifier.toLowerCase(),
    };
  }

  // ----------------------------------------------------------
  // PHONE
  // ----------------------------------------------------------

  if (
    looksLikePhoneIdentifier(
      identifier
    )
  ) {
    return {
      type: "phone",
      value:
        normalizeIndianPhone(
          identifier
        ),
    };
  }

  // ----------------------------------------------------------
  // INVALID
  // ----------------------------------------------------------

  throw new Error(
    "Enter a valid email address or 10-digit Indian phone number."
  );
}

/**
 * Stores whether signup started with email or phone.
 *
 * Onboarding uses this to know which identifier is missing.
 */
export function saveSignupIdentifierType(
  type: "email" | "phone"
): void {
  sessionStorage.setItem(
    "renflix_signup_identifier_type",
    type
  );
}

/**
 * Gets the signup identifier type.
 */
export function getSignupIdentifierType():
  | "email"
  | "phone"
  | null {
  const value =
    sessionStorage.getItem(
      "renflix_signup_identifier_type"
    );

  if (
    value === "email" ||
    value === "phone"
  ) {
    return value;
  }

  return null;
}

/**
 * Clears temporary signup state.
 */
export function clearSignupIdentifierType(): void {
  sessionStorage.removeItem(
    "renflix_signup_identifier_type"
  );
}

/**
 * Updates email and/or phone on the currently authenticated
 * Supabase Auth user.
 */
export async function updateAuthIdentifiers({
  email,
  phone,
}: {
  email?: string | null;
  phone?: string | null;
}) {
  const payload: {
    email?: string;
    phone?: string;
  } = {};

  // ----------------------------------------------------------
  // EMAIL
  // ----------------------------------------------------------

  if (
    email !== undefined &&
    email !== null
  ) {
    const normalizedEmail =
      email
        .trim()
        .toLowerCase();

    if (
      !isEmailIdentifier(
        normalizedEmail
      )
    ) {
      throw new Error(
        "Enter a valid email address."
      );
    }

    payload.email =
      normalizedEmail;
  }

  // ----------------------------------------------------------
  // PHONE
  // ----------------------------------------------------------

  if (
    phone !== undefined &&
    phone !== null
  ) {
    payload.phone =
      normalizeIndianPhone(
        phone
      );
  }

  // Nothing to update.
  if (
    Object.keys(payload)
      .length === 0
  ) {
    return {
      data: null,
      error: null,
    };
  }

  return supabase.auth.updateUser(
    payload
  );
}

/**
 * Synchronizes email/phone in public.profiles.
 */
export async function syncProfileIdentifiers({
  userId,
  email,
  phone,
}: {
  userId: string;
  email?: string | null;
  phone?: string | null;
}) {
  const updates: {
    email?: string | null;
    phone?: string | null;
    updated_at: string;
  } = {
    updated_at:
      new Date().toISOString(),
  };

  // ----------------------------------------------------------
  // EMAIL
  // ----------------------------------------------------------

  if (
    email !== undefined
  ) {
    updates.email =
      email
        ? email
            .trim()
            .toLowerCase()
        : null;
  }

  // ----------------------------------------------------------
  // PHONE
  // ----------------------------------------------------------

  if (
    phone !== undefined
  ) {
    updates.phone =
      phone
        ? normalizeIndianPhone(
            phone
          )
        : null;
  }

  return supabase
    .from("profiles")
    .update(updates)
    .eq(
      "id",
      userId
    );
}