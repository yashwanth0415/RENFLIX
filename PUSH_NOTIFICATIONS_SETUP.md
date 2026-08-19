# RENFLIX Push Notifications

RENFLIX now uses standards-based Web Push. The browser registers `/sw.js`, the signed-in user stores a Push subscription in `push_subscriptions`, and the Supabase Edge Function `send-web-push` delivers notifications in the background.

## Render

Deploy RENFLIX as a Render Static Site with:

- Build command: `npm ci && npm run build`
- Publish directory: `dist`
- SPA rewrite: `/*` -> `/index.html`

`render.yaml` in this project already contains that SPA rewrite. Render documents this rewrite as the required setup for React Router deep links on static sites.

Add this build-time environment variable to the Render service:

`VITE_VAPID_PUBLIC_KEY=<your public VAPID key>`

## Generate VAPID keys

Run:

`npx web-push generate-vapid-keys`

Store the generated public key as `VITE_VAPID_PUBLIC_KEY` in Render. Do not expose the private key in the frontend.

## Supabase Edge Function

Deploy:

`supabase functions deploy send-web-push --project-ref <PROJECT_REF> --no-verify-jwt`

Set these secrets:

`supabase secrets set VAPID_PUBLIC_KEY=<public> VAPID_PRIVATE_KEY=<private> VAPID_SUBJECT=mailto:admin@renflix.onrender.com --project-ref <PROJECT_REF>`

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are available to Supabase Edge Functions in the hosted project.

## Database Webhook

In Supabase Dashboard -> Database -> Webhooks, create an INSERT webhook on `public.notifications` targeting the `send-web-push` Edge Function. Send the Supabase service key in the Authorization header as the database webhook documentation describes. This causes every RENFLIX notification row to be delivered to registered devices.

## iPhone / Safari

On iPhone/iPad, Web Push works for a web app that has been added to the Home Screen. After installing RENFLIX from Safari, open the installed RENFLIX app and tap **Settings -> Device notifications -> Enable**. Apple requires the permission request to be tied to user interaction; the RENFLIX Enable button does that.

A normal Safari tab can still load the app, but the iOS background Push API is intended for the Home Screen web app.
