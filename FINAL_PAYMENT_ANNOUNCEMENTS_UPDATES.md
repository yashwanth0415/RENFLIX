# RENFLIX Final Changes — Payment Proof, Announcements, PWA UI

## Tenant payment proof
Tenant payment cards now show **Pay Now** and **Done** for pending payments. Done opens:
- Payment mode
- Transaction ID
- Remarks
- Optional screenshot

The screenshot is stored privately in the `payment-submissions` Supabase Storage bucket. Submitting changes the payment to `UNDER_REVIEW`.

## Admin review
Admin Payments includes `UNDER_REVIEW` and `RECEIVED`. When the admin changes a submitted payment to `RECEIVED`, the database:
- records the paid date if missing
- notifies the tenant that the payment is approved
- notifies the owner/property manager that payment was received

## Announcements
Owner Community announcements now notify every active tenant in the organization. Tenants have a read-only **Announcements** sidebar page with realtime updates.

## Messages
Tenant Messages no longer shows the left conversation list. The conversation panel fills the page and is labeled **Property Owner**. Owner tenant selector and Select/Delete controls are aligned to the same height.

## Alerts
Toast notifications render through a portal directly under `document.body`, fixed at the bottom-right with safe-area support, so transformed page containers cannot reposition them.

## Mobile/PWA controls
Select controls use a white arrow and dark color scheme on mobile. Existing manifest, icons, and PWA files are preserved.

## Supabase
Apply:
`supabase/migrations/20260822_payment_proof_announcements.sql`

Then run:
`npm install`
`npm run build`
