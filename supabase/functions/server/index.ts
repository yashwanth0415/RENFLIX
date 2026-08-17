import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";

const app = new Hono();

// ------------------------------------------------------------
// LOGGER
// ------------------------------------------------------------

app.use("*", logger(console.log));

// ------------------------------------------------------------
// CORS
// ------------------------------------------------------------

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

    exposeHeaders: [
      "Content-Length",
    ],

    maxAge: 600,
  })
);

// ------------------------------------------------------------
// HEALTH CHECK
// ------------------------------------------------------------

app.get("/health", (c) => {
  return c.json({
    status: "ok",
    service: "renflix-server",
    timestamp: new Date().toISOString(),
  });
});

// ------------------------------------------------------------
// DATABASE SETUP
// ------------------------------------------------------------
//
// IMPORTANT:
//
// Database creation and migrations are NOT performed by this
// Edge Function anymore.
//
// The authoritative database schema is:
//
// supabase/migrations/*.sql
//
// This endpoint is intentionally disabled so an old frontend,
// deployment, or script cannot recreate the outdated schema.
//

app.post("/setup-db", (c) => {
  return c.json(
    {
      success: false,

      code:
        "DATABASE_SETUP_REMOVED",

      message:
        "Database setup is managed through Supabase migrations. Run the migrations in supabase/migrations instead of calling /setup-db.",
    },
    410
  );
});

// ------------------------------------------------------------
// UNKNOWN ROUTE
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
// START SERVER
// ------------------------------------------------------------

Deno.serve(app.fetch);