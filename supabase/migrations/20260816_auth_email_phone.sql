-- ============================================================
-- RENFLIX AUTH EMAIL + PHONE MIGRATION
-- ============================================================
--
-- Purpose:
--
-- 1. Add public.profiles.email for existing databases.
-- 2. Synchronize existing profile emails from auth.users.
-- 3. Normalize existing Indian phone numbers.
-- 4. Normalize existing profile emails.
-- 5. Detect duplicate email addresses.
-- 6. Detect duplicate phone numbers.
-- 7. Create unique indexes for email and phone.
--
-- Authentication source of truth:
--
-- auth.users
--
-- Application profile:
--
-- public.profiles
--
-- The application keeps both records synchronized during:
--
-- - signup
-- - onboarding
-- - settings updates
--
-- No auth.users -> profiles trigger is created here.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. MAKE SURE PROFILES TABLE EXISTS
-- ============================================================
--
-- On an existing RENFLIX installation the table already exists.
--
-- On a fresh installation, query.sql should have created it
-- already. This check prevents a confusing ALTER TABLE failure
-- if migration ordering differs.
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
  ) THEN
    RAISE NOTICE
      'RENFLIX auth migration skipped: public.profiles does not exist yet. The master schema must create it first.';
  END IF;
END $$;


-- ============================================================
-- 2. ADD EMAIL COLUMN
-- ============================================================
--
-- Only execute when public.profiles exists.
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
  ) THEN

    ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS email TEXT;

  END IF;
END $$;


-- ============================================================
-- 3. SYNCHRONIZE EXISTING EMAIL VALUES
-- ============================================================
--
-- auth.users.email is the authentication source of truth.
--
-- Example:
--
-- Yashwanth@Gmail.com
--        ↓
-- yashwanth@gmail.com
--
-- Only users with a non-null Auth email are copied.
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'email'
  ) THEN

    UPDATE public.profiles AS p
    SET email = LOWER(TRIM(u.email))
    FROM auth.users AS u
    WHERE u.id = p.id
      AND u.email IS NOT NULL
      AND (
        p.email IS NULL
        OR p.email <> LOWER(TRIM(u.email))
      );

  END IF;
END $$;


-- ============================================================
-- 4. NORMALIZE EXISTING PROFILE EMAILS
-- ============================================================
--
-- This also cleans profiles that already had an email value
-- before this migration was introduced.
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'email'
  ) THEN

    UPDATE public.profiles
    SET email = LOWER(TRIM(email))
    WHERE email IS NOT NULL
      AND BTRIM(email) <> '';

  END IF;
END $$;


-- ============================================================
-- 5. NORMALIZE EXISTING INDIAN PHONE NUMBERS
-- ============================================================
--
-- Supported values:
--
-- 9876543210
-- 919876543210
-- +919876543210
-- +91 98765 43210
-- +91-98765-43210
--
-- Final:
--
-- +919876543210
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'phone'
  ) THEN

    UPDATE public.profiles
    SET phone =
      CASE

        -- +91XXXXXXXXXX
        WHEN regexp_replace(
          phone,
          '[^0-9+]',
          '',
          'g'
        ) ~ '^\+91[6-9][0-9]{9}$'
        THEN
          '+91' ||
          substring(
            regexp_replace(
              phone,
              '[^0-9]',
              '',
              'g'
            )
            FROM 3
            FOR 10
          )

        -- 91XXXXXXXXXX
        WHEN regexp_replace(
          phone,
          '[^0-9]',
          '',
          'g'
        ) ~ '^91[6-9][0-9]{9}$'
        THEN
          '+91' ||
          substring(
            regexp_replace(
              phone,
              '[^0-9]',
              '',
              'g'
            )
            FROM 3
            FOR 10
          )

        -- XXXXXXXXXX
        WHEN regexp_replace(
          phone,
          '[^0-9]',
          '',
          'g'
        ) ~ '^[6-9][0-9]{9}$'
        THEN
          '+91' ||
          regexp_replace(
            phone,
            '[^0-9]',
            '',
            'g'
          )

        ELSE phone

      END

    WHERE phone IS NOT NULL
      AND BTRIM(phone) <> '';

  END IF;
END $$;


-- ============================================================
-- 6. VALIDATE EMAIL DUPLICATES
-- ============================================================
--
-- The unique index below will be case-insensitive.
--
-- Example:
--
-- test@gmail.com
-- TEST@GMAIL.COM
--
-- are treated as the same email.
-- ============================================================

DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'email'
  ) THEN

    SELECT COUNT(*)
    INTO duplicate_count
    FROM (
      SELECT
        LOWER(TRIM(email))
          AS normalized_email

      FROM public.profiles

      WHERE email IS NOT NULL
        AND BTRIM(email) <> ''

      GROUP BY
        LOWER(TRIM(email))

      HAVING COUNT(*) > 1
    ) duplicates;

    IF duplicate_count > 0 THEN
      RAISE EXCEPTION
        'RENFLIX migration stopped: duplicate email addresses exist in public.profiles. Resolve them before creating the unique email index.';
    END IF;

  END IF;

END $$;


-- ============================================================
-- 7. VALIDATE PHONE DUPLICATES
-- ============================================================

DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'phone'
  ) THEN

    SELECT COUNT(*)
    INTO duplicate_count
    FROM (
      SELECT
        phone

      FROM public.profiles

      WHERE phone IS NOT NULL
        AND BTRIM(phone) <> ''

      GROUP BY
        phone

      HAVING COUNT(*) > 1
    ) duplicates;

    IF duplicate_count > 0 THEN
      RAISE EXCEPTION
        'RENFLIX migration stopped: duplicate phone numbers exist in public.profiles. Resolve them before creating the unique phone index.';
    END IF;

  END IF;

END $$;


-- ============================================================
-- 8. EMAIL UNIQUE INDEX
-- ============================================================
--
-- Unique and case-insensitive.
-- NULL/blank values are allowed.
-- ============================================================

DO $$
BEGIN

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'email'
  ) THEN

    CREATE UNIQUE INDEX IF NOT EXISTS
      profiles_email_unique
    ON public.profiles (
      LOWER(email)
    )
    WHERE email IS NOT NULL
      AND BTRIM(email) <> '';

  END IF;

END $$;


-- ============================================================
-- 9. EMAIL SEARCH INDEX
-- ============================================================

DO $$
BEGIN

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'email'
  ) THEN

    CREATE INDEX IF NOT EXISTS
      idx_profiles_email
    ON public.profiles (
      LOWER(email)
    );

  END IF;

END $$;


-- ============================================================
-- 10. PHONE UNIQUE INDEX
-- ============================================================

DO $$
BEGIN

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'phone'
  ) THEN

    CREATE UNIQUE INDEX IF NOT EXISTS
      profiles_phone_unique
    ON public.profiles (
      phone
    )
    WHERE phone IS NOT NULL
      AND BTRIM(phone) <> '';

  END IF;

END $$;


-- ============================================================
-- 11. PHONE SEARCH INDEX
-- ============================================================

DO $$
BEGIN

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'phone'
  ) THEN

    CREATE INDEX IF NOT EXISTS
      idx_profiles_phone
    ON public.profiles (
      phone
    );

  END IF;

END $$;


-- ============================================================
-- 12. NO AUTH USER TRIGGER
-- ============================================================
--
-- DO NOT create:
--
-- auth.users -> profiles trigger
--
-- The RENFLIX application explicitly handles profile creation
-- and synchronization during onboarding.
--
-- This prevents duplicate profiles and allows onboarding to
-- collect the missing identifier first.
-- ============================================================

COMMIT;