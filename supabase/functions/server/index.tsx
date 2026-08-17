import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";

const app = new Hono();

app.use("*", logger(console.log));

app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "apikey",
      "x-client-info",
    ],
    allowMethods: [
      "GET",
      "POST",
      "PUT",
      "DELETE",
      "OPTIONS",
    ],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  })
);

// ------------------------------------------------------------
// HEALTH CHECK
// ------------------------------------------------------------
//
// This endpoint is intentionally kept.
//
// It can be used to verify that the RENFLIX server function
// is deployed and responding.
//
// ------------------------------------------------------------

app.get("/health", (c) => {
  return c.json({
    status: "ok",
    service: "renflix-server",
    timestamp: new Date().toISOString(),
  });
});

// ------------------------------------------------------------
// DATABASE SETUP HAS BEEN REMOVED
// ------------------------------------------------------------
//
// IMPORTANT:
//
// The browser must NOT create or modify the RENFLIX database
// schema.
//
// Database structure is now managed exclusively through:
//
// supabase/migrations/*.sql
//
// This prevents the following two systems from getting out
// of sync:
//
// 1. Supabase migrations
// 2. /setup-db Edge Function
//
// The old /setup-db endpoint also created:
//
// - an outdated profiles table
// - an auth.users trigger
//
// Those are no longer used.
//
// ------------------------------------------------------------

app.post("/setup-db", (c) => {
  return c.json(
    {
      success: false,
      code: "DATABASE_SETUP_REMOVED",
      message:
        "Database setup is managed through Supabase migrations. Run the migrations in supabase/migrations instead of calling /setup-db.",
    },
    410
  );
});

// ------------------------------------------------------------
// Unknown route
// ------------------------------------------------------------

app.notFound((c) => {
  return c.json(
    {
      error: "Route not found",
    },
    404
  );
});

// ------------------------------------------------------------
// Start Edge Function
// ------------------------------------------------------------

Deno.serve(app.fetch);