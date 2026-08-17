import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors,
      "Content-Type": "application/json",
    },
  });
}

/*
 * Normalize Indian phone number.
 *
 * Accepted:
 * 9876543210
 * +919876543210
 * 919876543210
 *
 * Stored as:
 * +919876543210
 *
 * Password:
 * 9876543210
 */
function normalizeIndianPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (digits.length === 10) {
    return {
      phone: `+91${digits}`,
      password: digits,
    };
  }

  if (
    digits.length === 12 &&
    digits.startsWith("91")
  ) {
    const mobile = digits.slice(2);

    return {
      phone: `+91${mobile}`,
      password: mobile,
    };
  }

  throw new Error(
    "Please enter a valid 10-digit Indian mobile number."
  );
}

Deno.serve(async (req) => {
  /*
   * =====================================================
   * CORS
   * =====================================================
   */

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: cors,
    });
  }

  if (req.method !== "POST") {
    return json(
      {
        error: "Method not allowed",
      },
      405
    );
  }

  try {
    /*
     * ===================================================
     * SUPABASE CLIENTS
     * ===================================================
     */

    const url =
      Deno.env.get("SUPABASE_URL");

    const anon =
      Deno.env.get(
        "SUPABASE_ANON_KEY"
      );

    const service =
      Deno.env.get(
        "SUPABASE_SERVICE_ROLE_KEY"
      );

    if (!url || !anon || !service) {
      return json(
        {
          error:
            "Supabase environment variables are not configured.",
        },
        500
      );
    }

    /*
     * ===================================================
     * VERIFY CALLER
     * ===================================================
     */

    const authHeader =
      req.headers.get(
        "Authorization"
      );

    if (!authHeader) {
      return json(
        {
          error:
            "Unauthorized",
        },
        401
      );
    }

    const caller =
      createClient(
        url,
        anon,
        {
          global: {
            headers: {
              Authorization:
                authHeader,
            },
          },
        }
      );

    const {
      data: {
        user,
      },
      error: userError,
    } =
      await caller.auth.getUser();

    if (
      userError ||
      !user
    ) {
      return json(
        {
          error:
            "Unauthorized",
        },
        401
      );
    }

    /*
     * ===================================================
     * ADMIN CLIENT
     * ===================================================
     */

    const admin =
      createClient(
        url,
        service
      );

    /*
     * ===================================================
     * CHECK OWNER / STAFF ROLE
     * ===================================================
     */

    const {
      data: owner,
      error: ownerError,
    } = await admin
      .from("profiles")
      .select(
        "id,role,organization_id"
      )
      .eq(
        "id",
        user.id
      )
      .maybeSingle();

    if (ownerError) {
      throw ownerError;
    }

    const allowedRoles = [
      "OWNER",
      "PROPERTY_MANAGER",
      "HOSTEL_MANAGER",
      "ADMIN",
    ];

    if (
      !owner ||
      !allowedRoles.includes(
        owner.role
      )
    ) {
      return json(
        {
          error:
            "Only property staff can create tenant accounts.",
        },
        403
      );
    }

    if (
      !owner.organization_id &&
      owner.role !== "ADMIN"
    ) {
      return json(
        {
          error:
            "No organization found.",
        },
        400
      );
    }

    /*
     * ===================================================
     * REQUEST BODY
     * ===================================================
     */

    const body =
      await req.json();

    const {
      full_name,
      email,
      phone,

      emergency_contact_name,
      emergency_contact_phone,
      emergency_email,

      property_id,
      unit_id,

      move_in_date,

      status = "ACTIVE",
    } = body;

    /*
     * ===================================================
     * BASIC VALIDATION
     * ===================================================
     */

    if (
      !full_name ||
      !email ||
      !phone
    ) {
      return json(
        {
          error:
            "Full name, email and phone are required.",
        },
        400
      );
    }

    /*
     * ===================================================
     * NORMALIZE PHONE
     * ===================================================
     *
     * Example:
     *
     * Input:
     * 9876543210
     *
     * Auth phone:
     * +919876543210
     *
     * Password:
     * 9876543210
     */

    let normalizedPhone: string;
    let tenantPassword: string;

    try {
      const result =
        normalizeIndianPhone(
          String(phone)
        );

      normalizedPhone =
        result.phone;

      tenantPassword =
        result.password;
    } catch (error) {
      return json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Invalid phone number.",
        },
        400
      );
    }

    const normalizedEmail =
      String(email)
        .trim()
        .toLowerCase();

    const normalizedName =
      String(full_name)
        .trim();

    if (
      normalizedName.length ===
      0
    ) {
      return json(
        {
          error:
            "Full name is required.",
        },
        400
      );
    }

    /*
     * ===================================================
     * ORGANIZATION
     * ===================================================
     */

    const orgId =
      owner.organization_id;

    /*
     * ===================================================
     * VALIDATE PROPERTY
     * ===================================================
     */

    if (
      orgId &&
      property_id
    ) {
      const {
        data: prop,
        error: propError,
      } = await admin
        .from("properties")
        .select("id")
        .eq(
          "id",
          property_id
        )
        .eq(
          "organization_id",
          orgId
        )
        .maybeSingle();

      if (propError) {
        throw propError;
      }

      if (!prop) {
        return json(
          {
            error:
              "Invalid property.",
          },
          400
        );
      }
    }

    /*
     * ===================================================
     * VALIDATE UNIT
     * ===================================================
     */

    if (
      orgId &&
      unit_id
    ) {
      const {
        data: unit,
        error: unitError,
      } = await admin
        .from("units")
        .select(
          "id,property_id,status"
        )
        .eq(
          "id",
          unit_id
        )
        .eq(
          "organization_id",
          orgId
        )
        .maybeSingle();

      if (unitError) {
        throw unitError;
      }

      if (
        !unit ||
        (
          property_id &&
          unit.property_id !==
            property_id
        )
      ) {
        return json(
          {
            error:
              "Invalid unit.",
          },
          400
        );
      }

      if (
        unit.status !==
        "AVAILABLE"
      ) {
        return json(
          {
            error:
              "Selected unit is not available.",
          },
          400
        );
      }
    }

    /*
     * ===================================================
     * CREATE AUTH ACCOUNT
     * ===================================================
     */

    const {
      data: created,
      error: authError,
    } =
      await admin.auth.admin.createUser(
        {
          email:
            normalizedEmail,

          phone:
            normalizedPhone,

          password:
            tenantPassword,

          email_confirm:
            true,

          phone_confirm:
            true,

          user_metadata: {
            full_name:
              normalizedName,

            role:
              "TENANT",
          },
        }
      );

    /*
     * ===================================================
     * AUTH ERROR
     * ===================================================
     */

    if (
      authError ||
      !created?.user
    ) {
      const message =
        authError?.message?.toLowerCase() ||
        "";

      if (
        message.includes(
          "already"
        ) ||
        message.includes(
          "exists"
        ) ||
        authError?.code ===
          "email_exists"
      ) {
        return json(
          {
            error:
              "An account already exists with this email or phone.",
          },
          409
        );
      }

      throw (
        authError ||
        new Error(
          "Unable to create Auth user."
        )
      );
    }

    const authUser =
      created.user;

    /*
     * ===================================================
     * CREATE / UPDATE PROFILE
     * ===================================================
     */

    const {
      error: profileError,
    } = await admin
      .from("profiles")
      .upsert(
        {
          id:
            authUser.id,

          email:
            normalizedEmail,

          phone:
            normalizedPhone,

          full_name:
            normalizedName,

          role:
            "TENANT",

          organization_id:
            orgId,
        },
        {
          onConflict:
            "id",
        }
      );

    if (profileError) {
      await admin.auth.admin.deleteUser(
        authUser.id
      );

      throw profileError;
    }

    /*
     * ===================================================
     * CREATE TENANT RECORD
     * ===================================================
     */

    const {
      data: tenant,
      error: tenantError,
    } = await admin
      .from("tenants")
      .insert(
        {
          organization_id:
            orgId,

          profile_id:
            authUser.id,

          full_name:
            normalizedName,

          email:
            normalizedEmail,

          phone:
            normalizedPhone,

          emergency_contact_name:
            emergency_contact_name ||
            null,

          emergency_contact_phone:
            emergency_contact_phone ||
            null,

          emergency_email:
            emergency_email ||
            null,

          unit_id:
            unit_id ||
            null,

          move_in_date:
            move_in_date ||
            null,

          status,
        }
      )
      .select("*")
      .single();

    /*
     * ===================================================
     * TENANT INSERT ERROR
     * ===================================================
     */

    if (tenantError) {
      /*
       * Roll back Auth user if
       * tenant creation failed.
       */
      await admin.auth.admin.deleteUser(
        authUser.id
      );

      throw tenantError;
    }

    /*
     * ===================================================
     * MARK UNIT OCCUPIED
     * ===================================================
     */

    if (
      unit_id &&
      status === "ACTIVE"
    ) {
      const {
        error: unitUpdateError,
      } = await admin
        .from("units")
        .update({
          status:
            "OCCUPIED",
        })
        .eq(
          "id",
          unit_id
        );

      if (unitUpdateError) {
        console.error(
          "Unable to update unit status:",
          unitUpdateError
        );
      }
    }

    /*
     * ===================================================
     * SUCCESS
     * ===================================================
     *
     * IMPORTANT:
     *
     * The password is the tenant's
     * 10-digit mobile number.
     */

    return json({
      success: true,

      tenant,

      temporary_password:
        tenantPassword,

      login_phone:
        normalizedPhone,

      message:
        "Tenant account created successfully. The initial password is the tenant's 10-digit mobile number.",
    });
  } catch (e) {
    console.error(
      "Tenant provisioning error:",
      e
    );

    return json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Tenant provisioning failed.",
      },
      500
    );
  }
});