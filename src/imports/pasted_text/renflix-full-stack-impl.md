# RENFLIX — FULL-STACK PRODUCTION IMPLEMENTATION MASTER PROMPT

## IMPORTANT: THIS IS AN IMPLEMENTATION TASK, NOT A PROTOTYPE TASK

Build **RENFLIX** as a **fully functional, production-ready Progressive Web App**, not as a visual prototype, static mockup, or collection of disconnected screens.

The project already has:

* A connected Supabase project named **RENFLIX**
* A connected GitHub repository named **RENFLIX**

Use these existing integrations.

Do NOT create a second Supabase project.

Do NOT create a second GitHub repository.

Do NOT replace the existing connected project.

Do NOT use fake local-only data for functionality that belongs in Supabase.

Do NOT stop after creating UI screens.

The final result must be a working full-stack application where:

**Frontend → Supabase → Database / Storage / Realtime / Edge Functions**

are actually connected and functional.

The application must be capable of being built and deployed from the connected GitHub repository.

---

# 1. PRIMARY OBJECTIVE

Build:

# RENFLIX

### Every Property. One Powerful Platform.

### Manage. Rent. Maintain. Grow.

RENFLIX is an all-in-one property operating system for:

* Houses
* Apartments
* Flats
* Hostels
* PGs
* Co-living
* Student housing
* Villas
* Gated communities
* Residential societies
* Commercial buildings
* Shops
* Offices
* Warehouses
* Plots
* Land
* Mixed property portfolios

It must support:

**single-property owners → professional property managers → large property portfolios → communities → hostel/PG operators.**

## The original product requirements define this broad property coverage and the property hierarchy. Preserve that scope.

# 2. NON-NEGOTIABLE IMPLEMENTATION RULE

Do not interpret this prompt as:

"Create a Figma prototype."

Interpret it as:

"Build the actual application."

Every important button must have a real action.

Every form must submit real data.

Every list must load data from the appropriate Supabase table.

Every dashboard statistic must be calculated from database data.

Every CRUD operation must persist data.

Every role must have permission-controlled access.

Every protected page must require authentication.

Every file upload must use Supabase Storage.

Realtime features must use Supabase Realtime where appropriate.

Database access must use secure RLS.

Backend-only secrets must never be exposed to the browser.

---

# 3. FIRST ACTION — INSPECT THE CONNECTED PROJECT

Before creating new files:

1. Inspect the existing RENFLIX project.
2. Inspect the current frontend structure.
3. Inspect package.json.
4. Inspect existing Supabase configuration.
5. Inspect existing environment-variable references.
6. Inspect existing database/schema if accessible.
7. Inspect existing Supabase migrations.
8. Inspect existing GitHub-connected project files.
9. Reuse existing working code where appropriate.
10. Do not unnecessarily delete working functionality.
11. Identify missing functionality.
12. Create a clean implementation plan internally.
13. Then implement the complete application.

Do not blindly overwrite the project.

If something already exists and works, improve or integrate it.

---

# 4. TECHNOLOGY STACK

Use:

### Frontend

React

TypeScript

Vite

React Router

Tailwind CSS

Accessible component architecture

Responsive design

PWA

### Backend

Supabase

Supabase Auth

Supabase PostgreSQL

Supabase Storage

Supabase Realtime

Supabase Edge Functions where server-side logic is required

### Database

PostgreSQL through Supabase

### PWA

Web App Manifest

Service Worker

Offline-aware architecture

Installable application

Cache strategy

Network detection

Update mechanism

### Code quality

TypeScript strictness where practical

Reusable components

Feature-based architecture

Typed database interactions

Error handling

Loading states

Empty states

Accessible forms

Production-safe environment handling

Use the official Supabase React approach and environment-variable convention appropriate for Vite.

---

# 5. IMPORTANT ENVIRONMENT SECURITY RULE

Never place:

* Supabase service-role key
* Private API keys
* Payment secret keys
* AI secret keys
* Admin secrets

inside frontend source code.

Frontend may use only the public/publishable Supabase configuration intended for browser use.

Use environment variables.

Expected frontend configuration:

VITE_SUPABASE_URL

VITE_SUPABASE_PUBLISHABLE_KEY

If the existing connected project uses a different safe public-key variable, inspect and preserve it instead of creating conflicting configuration.

Server-only secrets must be used only inside Supabase Edge Functions or another secure server-side environment.

---

# 6. PROJECT ARCHITECTURE

Use a clean structure similar to:

src/
app/
components/
features/
auth/
dashboard/
properties/
units/
tenants/
leases/
payments/
maintenance/
expenses/
documents/
community/
messaging/
analytics/
ai/
notifications/
admin/
hooks/
lib/
supabase/
services/
types/
utils/
pages/
routes/

public/
icons/
images/
manifest.webmanifest

supabase/
migrations/
functions/
seed.sql
config.toml

tests/

Do not create unnecessary duplicate folders.

Keep the architecture understandable for another developer.

---

# 7. DATABASE-FIRST IMPLEMENTATION

The database is the source of truth.

Do not build a fake frontend first and connect it later.

Implement the database structure required by RENFLIX before implementing dependent functionality.

Create version-controlled Supabase migration files.

Use migrations for schema changes.

Do not rely on manually changing the remote database without corresponding migration files.

Supabase recommends tracking schema changes through migrations and deploying them with `supabase db push`.

---

# 8. DATABASE CORE

Create the necessary tables for:

## ORGANIZATION

organizations

profiles

organization_members

roles

permissions

role_permissions

---

## PORTFOLIO

portfolios

---

## PROPERTY

properties

property_types

property_images

property_amenities

---

## PROPERTY HIERARCHY

buildings

floors

units

rooms

beds

parking_spaces

---

## PEOPLE

tenants

staff

technicians

service_providers

---

## LEASE

leases

lease_documents

rent_schedules

deposits

---

## PAYMENTS

payments

payment_receipts

payment_methods

late_fees

---

## MAINTENANCE

maintenance_requests

maintenance_comments

maintenance_images

maintenance_assignments

preventive_maintenance

maintenance_categories

---

## EXPENSES

expenses

expense_categories

---

## DOCUMENTS

documents

document_categories

---

## COMMUNICATION

conversations

conversation_members

messages

message_attachments

---

## NOTIFICATIONS

notifications

notification_preferences

---

## COMMUNITY

community_announcements

visitors

amenities

amenity_bookings

parking_spaces

community_events

---

## ANALYTICS

analytics_snapshots

property_metrics

---

## AI

ai_insights

ai_conversations

ai_messages

---

## SYSTEM

activity_logs

subscriptions

subscription_usage

---

# 9. DATABASE RELATIONSHIP

Implement:

Organization
↓
Portfolio
↓
Property
↓
Building
↓
Floor
↓
Unit
↓
Room
↓
Bed

Also support properties without buildings where appropriate.

For example:

House
→ Unit

Apartment:
Property
→ Building
→ Floor
→ Flat

PG:
Property
→ Building
→ Floor
→ Room
→ Bed

Plot:
Property
→ Plot Unit

Commercial:
Property
→ Shop / Office / Warehouse Unit

Do not force every property type into the same physical hierarchy.

Use flexible nullable relationships where appropriate.

---

# 10. PROPERTY DATA MODEL

Every property should support:

id

organization_id

portfolio_id

name

property_type

description

address

city

state

country

postal_code

latitude

longitude

image

status

created_by

created_at

updated_at

---

# 11. UNIT DATA MODEL

Every unit should support:

id

property_id

building_id

floor_id

unit_number

unit_type

name

area

status

monthly_rent

security_deposit

occupancy_status

metadata

created_at

updated_at

---

# 12. TENANT DATA MODEL

Support:

profile

phone

email

emergency contact

identity metadata where appropriate

unit

room

bed

move-in date

move-out date

status

lease

deposit

rent

---

# 13. LEASE SYSTEM

Implement:

Create lease

Edit lease

Terminate lease

Renew lease

Start date

End date

Rent

Deposit

Notice period

Late fee

Payment frequency

Lease status

Document attachment

Renewal reminders

Expiry reminders

---

# 14. RENT SCHEDULE SYSTEM

Automatically generate rent schedules from active leases.

Example:

Lease:

₹18,000/month

Start:

1 August 2026

Generate monthly rent records.

Statuses:

Upcoming

Due

Paid

Partially Paid

Overdue

Waived

Cancelled

---

# 15. PAYMENT SYSTEM

Implement actual database-backed payment records.

Support:

UPI

Card

Bank transfer

Cash

Manual payment

Do NOT pretend that a payment has succeeded without a real payment provider or explicit manual-payment confirmation.

For MVP:

Allow:

"Record Manual Payment"

with:

amount

payment date

method

reference

notes

receipt

Then architect the system so a real payment gateway can be added later.

If payment-gateway credentials are not available, clearly separate:

Manual Payment

from

Online Payment

Never fake a successful online transaction.

---

# 16. PAYMENT RECEIPTS

After a confirmed payment:

Create receipt record.

Display:

RENFLIX

Payment Successful

Amount

Tenant

Property

Unit

Payment method

Transaction/reference ID

Date

Generate printable/downloadable receipt.

---

# 17. MAINTENANCE SYSTEM

Implement real maintenance CRUD.

Create request:

Tenant

Property

Unit

Category

Description

Priority

Images

Preferred time

Status

Created date

Assigned technician

Estimated cost

Actual cost

---

# 18. MAINTENANCE STATUS MACHINE

Implement controlled status transitions:

SUBMITTED

→ REVIEWED

→ ASSIGNED

→ ACCEPTED

→ SCHEDULED

→ IN_PROGRESS

→ WAITING_FOR_PARTS

→ COMPLETED

→ VERIFIED

→ CLOSED

Prevent invalid status changes.

Record status history.

---

# 19. TECHNICIAN SYSTEM

Technicians can see only assigned jobs.

Technician can:

Accept

Reject

Start

Pause

Add note

Upload photo

Add material

Add cost

Complete

---

# 20. MAINTENANCE STORAGE

Use Supabase Storage for:

Maintenance photos

Videos if supported

Receipts

Invoices

Before/after images

Create secure access policies.

---

# 21. PREVENTIVE MAINTENANCE

Implement recurring maintenance.

Fields:

Property

Unit

Task

Frequency

Next due date

Assigned person

Status

Examples:

AC service

Water tank cleaning

Electrical inspection

Lift maintenance

Generator service

Pest control

---

# 22. DOCUMENT MANAGEMENT

Use Supabase Storage.

Buckets should be created only if they do not already exist.

Suggested buckets:

property-images

profile-images

documents

maintenance-media

payment-receipts

invoices

message-attachments

community-media

Implement:

Upload

Progress

Preview

Download

Delete

Search

Filter

Metadata

Permission checks

Never expose private files publicly unless explicitly intended.

---

# 23. SUPABASE STORAGE SECURITY

Create Storage policies corresponding to organization/property/user permissions.

A tenant must not be able to access another tenant's private document.

A technician must not be able to browse unrelated maintenance media.

An organization member should only access authorized organization files.

---

# 24. AUTHENTICATION

Use Supabase Auth.

Implement:

Signup

Login

Logout

Email verification

Password reset

Session persistence

Protected routes

Auth loading state

Unauthorized state

---

# 25. PROFILE CREATION

After first login:

Create or retrieve profile.

Never create duplicate profiles for the same authenticated user.

Profile fields:

id

full_name

phone

avatar_url

role

organization_id

created_at

updated_at

---

# 26. ROLE SYSTEM

Support:

OWNER

PROPERTY_MANAGER

TENANT

HOSTEL_MANAGER

TECHNICIAN

COMMUNITY_MANAGER

ADMIN

Do not rely only on frontend role checks.

Frontend role checks are for UX.

Database RLS must enforce authorization.

---

# 27. ROW LEVEL SECURITY

Enable RLS on all user-facing tables containing private or organization-owned data.

Implement policies for:

Owner

Manager

Tenant

Technician

Community Manager

Admin

Rules:

OWNER:
Can access organization resources they own/manage.

MANAGER:
Can access assigned properties.

TENANT:
Can access only their own profile, lease, unit, rent, payments, documents, maintenance requests and permitted conversations.

TECHNICIAN:
Can access only assigned maintenance jobs.

COMMUNITY MANAGER:
Can access authorized community resources.

ADMIN:
Platform administration.

Never trust:

user-provided organization_id

user-provided role

user-provided tenant_id

Use authenticated identity and database relationships for authorization.

---

# 28. DATABASE FUNCTIONS

Where appropriate, create PostgreSQL functions for safe calculations such as:

property occupancy

portfolio occupancy

rent collection

overdue rent

property revenue

property expenses

net income

maintenance counts

property health

Do not calculate sensitive totals solely from manipulated client-side state.

---

# 29. DASHBOARD MUST USE REAL DATA

Do NOT hardcode:

94%

₹8.42L

3 maintenance issues

etc.

Those numbers may be used as seed/demo data, but the dashboard must calculate them from Supabase.

Examples:

Total Properties

COUNT(properties)

Occupied Units

COUNT(occupied units)

Revenue

SUM(confirmed payments)

Expenses

SUM(expenses)

Net Income

Revenue - Expenses

---

# 30. OWNER DASHBOARD

Build:

Portfolio selector

Property health

Occupancy

Revenue

Collected rent

Pending rent

Overdue rent

Expenses

Net income

Maintenance

Lease expiries

Today's actions

Recent activity

AI insights

All values must come from Supabase.

---

# 31. PROPERTY MANAGEMENT

Implement complete CRUD:

Create

Read

Update

Delete/archive

Property image upload

Property type

Address

Units

Buildings

Floors

Rooms

Beds

Amenities

---

# 32. TENANT MANAGEMENT

Implement:

Add tenant

Invite tenant

Edit tenant

View tenant

Assign tenant

Transfer tenant

Deactivate tenant

Lease assignment

Payment history

Maintenance history

Documents

Messages

---

# 33. HOSTEL / PG MODE

Implement real bed-level management.

Example:

Property

→ Building

→ Floor

→ Room

→ Bed

Bed statuses:

AVAILABLE

RESERVED

OCCUPIED

MAINTENANCE

BLOCKED

Implement:

Check-in

Check-out

Room transfer

Bed transfer

Deposit

Rent

Food/mess charges

Resident complaints

Visitor records

---

# 34. COMMUNITY MODE

Implement:

Residents

Units

Announcements

Amenities

Bookings

Visitors

Parking

Complaints

Maintenance

Events

Community payments

---

# 35. PLOT / LAND MODE

Implement:

Plot number

Area

Dimensions

Location

Status

Ownership metadata

Expected value

Documents

Expenses

Activity

Statuses:

AVAILABLE

RESERVED

LEASED

SOLD

UNDER_DEVELOPMENT

---

# 36. COMMERCIAL MODE

Support:

Shop

Office

Warehouse

Business tenant

Lease

Rent

Deposit

Utilities

Maintenance

Expenses

Lease expiry

Revenue

---

# 37. NOTIFICATION SYSTEM

Create database-backed notifications.

Types:

PAYMENT

MAINTENANCE

LEASE

PROPERTY

COMMUNITY

MESSAGE

SYSTEM

Implement:

Unread count

Read

Mark all read

Delete/archive

Notification preferences

---

# 38. REALTIME

Use Supabase Realtime for appropriate live features.

At minimum:

Messages

Maintenance status

Notifications

Payment status

Technician assignment

Community announcements

Do not poll aggressively if Realtime can solve the problem.

---

# 39. MESSAGING

Implement real database-backed messaging.

Tables:

conversations

conversation_members

messages

message_attachments

Features:

Owner ↔ Tenant

Manager ↔ Tenant

Manager ↔ Technician

Community Manager ↔ Residents

Message timestamps

Unread count

Realtime updates

Attachment support

---

# 40. ANALYTICS

Build analytics from actual database records.

Metrics:

Revenue

Expenses

Net income

Occupancy

Rent collection

Overdue rent

Maintenance cost

Maintenance frequency

Tenant count

Property performance

---

# 41. ANALYTICS QUERIES

Create reusable data services/hooks for:

getPortfolioMetrics()

getPropertyMetrics()

getOccupancy()

getRentCollection()

getOutstandingRent()

getExpenses()

getMaintenanceMetrics()

getLeaseExpiries()

Do not duplicate database queries across every page.

---

# 42. RENFLIX INTELLIGENCE

Create an AI-ready architecture.

AI should analyze RENFLIX data and provide:

Portfolio summary

Property insights

Financial insights

Maintenance insights

Occupancy insights

Tenant insights

Recommendations

---

# 43. AI SAFETY AND SECURITY

Never send unrestricted private database data to an external AI provider.

Create server-side AI processing through Supabase Edge Functions when an external AI API is used.

The browser must never contain an AI provider's secret API key.

If no AI API key is configured:

Build a functional deterministic insight engine using database calculations.

Display:

"RENFLIX Intelligence"

and generate rule-based recommendations.

Do not display fake claims that an external AI model analyzed something if no model is actually connected.

---

# 44. AI QUESTIONS

Implement a query interface that supports questions such as:

Which property earns the most?

Which tenants have overdue rent?

Which property has the highest maintenance cost?

Which leases expire next month?

What needs my attention today?

Which units are vacant?

How is my portfolio performing?

---

# 45. PROPERTY HEALTH

Calculate a transparent property health score.

Use measurable signals such as:

Occupancy

Rent collection

Maintenance

Revenue

Expenses

Lease activity

Show users why the score exists.

Do not create unexplained fake AI numbers.

---

# 46. SEARCH

Implement real global search.

Search Supabase data for:

Properties

Units

Rooms

Beds

Tenants

Payments

Maintenance

Documents

Messages

Use debounced search.

Show grouped results.

Click result → navigate to the correct record.

---

# 47. ACTIVITY LOG

Implement:

activity_logs

Record important events:

Property created

Property updated

Tenant added

Lease created

Payment recorded

Maintenance created

Maintenance assigned

Maintenance completed

Document uploaded

Announcement published

Use this for property timeline and auditing.

---

# 48. AUDITABILITY

For important mutations, record:

actor

organization

action

entity type

entity ID

timestamp

metadata

Do not expose sensitive metadata unnecessarily.

---

# 49. PWA IMPLEMENTATION

Do not merely add a PWA icon.

Implement an actual PWA.

Create:

manifest.webmanifest

service worker

icons

splash-compatible configuration

theme colors

standalone display

installability

offline fallback

cache strategy

update detection

---

# 50. OFFLINE ARCHITECTURE

Read-only cached information may be available offline.

For mutations:

If offline:

Queue only safe operations.

Show:

"Waiting to sync."

When online:

Attempt synchronization.

Never silently lose user input.

Do not claim data was saved to Supabase until the operation succeeds or is safely queued.

---

# 51. RESPONSIVE DESIGN

Build mobile-first.

Required:

Mobile

Tablet

Desktop

Large desktop

Mobile should feel like an application.

Desktop should feel like a professional property management workspace.

---

# 52. MOBILE NAVIGATION

Owner:

Home

Properties

Payments

Maintenance

More

Tenant:

Home

Rent

Maintenance

Messages

More

PG Manager:

Home

Rooms

Rent

Maintenance

More

---

# 53. DESKTOP NAVIGATION

Dashboard

Portfolio

Properties

Units

Tenants

Leases

Payments

Maintenance

Expenses

Documents

Messages

Community

Analytics

RENFLIX Intelligence

Reports

Settings

Profile

Only display navigation items appropriate for the user's role.

---

# 54. CREATIVE UI

Use:

Deep navy

Royal blue

Electric blue accents

Soft neutral backgrounds

Emerald success

Amber warning

Red danger

Orange maintenance

Purple community

Violet AI

Use semantic colors.

Do not overuse gradients.

Do not make every element a card.

Use:

Large visual metrics

Interactive charts

Property imagery

Occupancy visualizations

Timeline

Status indicators

Maps where useful

---

# 55. BRAND

Create:

RENFLIX wordmark

RENFLIX icon

App icon

Favicon

Use a visual concept combining:

R

roof

key

door

location

Do not use "Propify".

The only product name is:

RENFLIX

---

# 56. UI LANGUAGE

Use simple language.

Bad:

Outstanding Receivables

Good:

Rent still to be collected

Bad:

Occupancy Ratio

Good:

Occupied spaces

Bad:

Maintenance SLA

Good:

Average repair time

---

# 57. DASHBOARD ATTENTION ENGINE

Create:

# What needs your attention?

Examples must be dynamically generated.

Urgent maintenance

Overdue rent

Lease expiries

Pending approvals

Unassigned jobs

Unpaid expenses

Never hardcode these.

---

# 58. PROPERTY PORTFOLIO

Create:

Grid

List

Map

Filters

Search

Sort

Property card should dynamically display:

Image

Name

Location

Type

Units

Occupancy

Revenue

Maintenance

Health

---

# 59. PROPERTY DETAILS

Tabs:

Overview

Units

Tenants

Leases

Payments

Maintenance

Expenses

Documents

Analytics

Activity

Everything should load from Supabase.

---

# 60. FORMS

Every form must have:

Validation

Required fields

Error messages

Loading state

Submit state

Success state

Cancel

Retry

Duplicate prevention

Accessible labels

Never silently fail.

---

# 61. DELETE SAFETY

Do not hard-delete critical financial or historical records unless explicitly appropriate.

Prefer:

archive

inactive

cancelled

soft delete

for records such as:

properties

tenants

leases

payments

maintenance

expenses

Preserve historical data.

---

# 62. ERROR HANDLING

Handle:

Supabase unavailable

Network error

Unauthorized

RLS rejection

Invalid form

Duplicate record

Storage failure

Realtime failure

Payment failure

Unknown error

Show friendly messages.

Never expose raw SQL errors to users.

---

# 63. LOADING STATES

Every asynchronous screen must have loading states.

Use skeletons.

Do not display blank screens while waiting for Supabase.

---

# 64. EMPTY STATES

Examples:

"No properties yet."

"Add your first property to get started."

"No tenants yet."

"No maintenance requests."

"No payments recorded."

"No notifications."

Make empty states useful with CTA buttons.

---

# 65. SUCCESS STATES

Examples:

Property added

Tenant added

Lease created

Payment recorded

Maintenance submitted

Document uploaded

Announcement published

Use subtle animations.

---

# 66. DEMO / SEED DATA

Create realistic seed/demo data for the first preview.

Use:

Green Residency

Sunrise Apartments

Urban Nest PG

Lakeview Community

Metro Heights

Harmony Villas

Tech Park Offices

Greenfield Plots

Locations:

Hyderabad

Secunderabad

Madhapur

Gachibowli

Kondapur

Kukatpally

Create realistic:

properties

units

rooms

beds

tenants

leases

payments

maintenance

expenses

announcements

activity

This data must be inserted through Supabase seed/migration mechanisms, not hardcoded into React components.

---

# 67. FIRST-LOGIN EXPERIENCE

For a new user:

Signup

→ Verify email if required

→ Profile

→ Select role

→ Create organization

→ Select property type

→ Add first property

→ Add units

→ Dashboard

For demo preview:

Also provide safe demo data so the dashboard is not empty.

---

# 68. DEMO ACCOUNT

If the environment supports creating a demo account safely, create one through the appropriate Supabase authentication workflow.

Never hardcode a real production password into source code.

If demo credentials cannot be automatically created, create a clear seeded-data preview mode without bypassing security.

Do not weaken RLS for the demo.

---

# 69. SECURITY CHECKLIST

Before finalizing:

Check:

RLS enabled

Private tables protected

Storage protected

No service-role key in frontend

No secret API key in frontend

No passwords committed

No .env secrets committed

No fake authorization

No client-only admin access

No unrestricted database queries

No cross-organization access

---

# 70. ENVIRONMENT FILES

Create:

.env.example

Document required variables.

Never commit:

.env

.env.local

secrets

service-role keys

private tokens

---

# 71. GITHUB IMPLEMENTATION

The connected GitHub repository is:

# RENFLIX

Use the existing connected repository.

After implementation:

1. Ensure all source files are present.
2. Ensure package.json is correct.
3. Ensure migrations are included.
4. Ensure Supabase functions are included.
5. Ensure PWA files are included.
6. Ensure tests are included where practical.
7. Ensure README exists.
8. Ensure .env.example exists.
9. Ensure secrets are excluded.
10. Build the project.
11. Fix build errors.
12. Fix TypeScript errors.
13. Fix runtime errors.
14. Verify the important flows.
15. Then commit/push the implementation to the connected RENFLIX GitHub repository if the connected GitHub integration permits write access.

Never claim that code was pushed unless the connected GitHub integration actually confirms the push.

If write access is unavailable, clearly report that limitation rather than pretending.

---

# 72. README

Create a professional README containing:

RENFLIX overview

Features

Tech stack

Architecture

Folder structure

Environment variables

Supabase setup

Database migrations

Storage buckets

RLS

Edge Functions

Local development

Build

Test

PWA

Deployment

Render deployment instructions

---

# 73. SUPABASE MIGRATION WORKFLOW

Create version-controlled SQL migrations.

The repository should contain:

supabase/migrations/

Use migrations for:

tables

indexes

constraints

functions

triggers

RLS

policies

seed data where appropriate

Supabase's recommended workflow is to version schema changes through migrations and deploy them with `supabase db push`.

---

# 74. DATABASE INDEXES

Create indexes for frequently queried columns such as:

organization_id

property_id

unit_id

tenant_id

lease_id

payment status

maintenance status

created_at

due_date

notification user ID

message conversation ID

Do not create unnecessary indexes everywhere.

---

# 75. DATA INTEGRITY

Use:

Foreign keys

Unique constraints

Check constraints

Not-null constraints where appropriate

Enums or controlled values where appropriate

Transactions for multi-step critical operations

Example:

Creating a lease and assigning a unit should not leave the database in a partially inconsistent state.

---

# 76. EDGE FUNCTIONS

Use Supabase Edge Functions only where server-side execution is needed.

Possible functions:

create-payment-intent

payment-webhook

send-notification

generate-report

ai-insight

ai-chat

lease-reminder

rent-reminder

maintenance-notification

Do not create Edge Functions unnecessarily.

---

# 77. SCHEDULED OPERATIONS

Where scheduled jobs are required, create an architecture that can support:

daily rent reminders

lease expiry reminders

preventive maintenance reminders

daily summaries

weekly reports

Use Supabase-supported scheduling mechanisms or Edge Functions as appropriate.

---

# 78. AI MAINTENANCE ASSISTANT

If a real AI provider is connected:

Send maintenance image + description securely through Edge Function.

Return:

possible category

suggested priority

suggested action

Always display:

"AI suggestion — verify before acting."

If no AI provider is connected:

Use a deterministic fallback based on selected category and description.

Never fake external AI processing.

---

# 79. ANALYTICS ARCHITECTURE

Do not create fake charts.

Charts must use data fetched from Supabase.

Create reusable analytics functions.

Examples:

monthly revenue

monthly expenses

occupancy by property

rent collection

maintenance costs

tenant growth

---

# 80. PERFORMANCE

Optimize:

Images

Queries

Pagination

Lazy loading

Charts

Realtime subscriptions

Storage access

Do not load the entire database into the browser.

Use pagination for large lists.

Use filters at database level.

---

# 81. PAGINATION

Implement pagination for:

Tenants

Payments

Maintenance

Documents

Messages

Activity logs

Properties if portfolio is large

---

# 82. SEARCH PERFORMANCE

Use:

debouncing

database filtering

proper indexes

limited result counts

Do not fetch every record and filter only in JavaScript.

---

# 83. ACCESSIBILITY

Implement:

Keyboard navigation

Accessible labels

Focus states

ARIA where needed

Color contrast

Large touch targets

Screen-reader-friendly controls

---

# 84. DARK MODE

Support:

Light

Dark

System

Persist preference.

---

# 85. RESPONSIVE TESTING

Verify:

320px+

375px

390px

768px

1024px

1280px

1440px+

No horizontal overflow.

No clipped buttons.

No broken tables.

No unusable forms.

---

# 86. ROUTING

Implement real protected routes.

Examples:

/login

/signup

/dashboard

/properties

/properties/:id

/units

/tenants

/tenants/:id

/leases

/payments

/maintenance

/documents

/messages

/community

/analytics

/intelligence

/settings

/admin

Redirect unauthorized users appropriately.

---

# 87. ROUTE SECURITY

Frontend routing is not the security layer.

Supabase RLS is the actual security layer.

Even if someone manually changes a URL, the database must deny unauthorized access.

---

# 88. COMMAND CENTER

Implement Ctrl/Cmd + K search.

Search:

property

tenant

unit

payment

maintenance

lease

document

message

Navigate directly to result.

---

# 89. PROPERTY TIMELINE

Show real activity:

Property created

Unit added

Tenant assigned

Lease created

Payment received

Maintenance submitted

Technician assigned

Repair completed

Expense added

Document uploaded

---

# 90. TENANT DASHBOARD

Show:

Home

Property

Unit

Next rent

Payment history

Maintenance

Lease

Documents

Messages

Notifications

---

# 91. OWNER DASHBOARD

Show:

Portfolio

Properties

Occupancy

Revenue

Rent collection

Expenses

Profit

Maintenance

Lease expiry

AI insights

Attention items

---

# 92. TECHNICIAN DASHBOARD

Show:

Today's jobs

Urgent

Assigned

In progress

Completed

Calendar

Messages

---

# 93. COMMUNITY DASHBOARD

Show:

Residents

Units

Announcements

Maintenance

Amenities

Visitors

Parking

Events

Payments

---

# 94. ADMIN DASHBOARD

Show:

Organizations

Users

Properties

Transactions

Maintenance

Subscriptions

System activity

Platform analytics

---

# 95. PROPERTY HEALTH

Create transparent calculation.

Example components:

Occupancy score

Collection score

Maintenance score

Revenue score

Expense score

Tenant activity score

Display breakdown when user clicks the score.

---

# 96. VISUAL DATA

Use:

Line charts

Bar charts

Donut/circular indicators

Progress bars

Timelines

Heatmaps only when useful

Property maps where appropriate

Avoid decorative charts without meaning.

---

# 97. CREATIVE DESIGN

RENFLIX should feel like a premium modern proptech startup.

Design language:

Modern SaaS

Fintech

Real estate

AI

Use:

Deep navy

Royal blue

Electric blue

Neutral backgrounds

Emerald

Amber

Red

Orange

Violet

Use beautiful property imagery.

Use strong typography.

Use subtle animation.

Do not make it look like a generic admin dashboard.

---

# 98. UX PRINCIPLE

Every screen must answer:

"What does the user need to know?"

"What can the user do next?"

"What action is most important?"

Make the primary action obvious.

---

# 99. NO FAKE FEATURES

This is extremely important.

Do NOT create:

Fake payment success

Fake AI analysis

Fake notifications

Fake realtime

Fake database

Fake authentication

Fake analytics

Fake file uploads

Fake user permissions

Fake GitHub push

Fake backend

If a third-party service is not configured, implement a clean integration boundary and clearly communicate the unavailable capability.

---

# 100. TESTING BEFORE FIRST PREVIEW

Before showing the first completed preview:

Run the equivalent of:

npm install

npm run build

and available test/lint/type-check commands.

Fix all errors.

Then verify the following flows:

### AUTH

Signup

Login

Logout

Protected route

### PROPERTY

Create property

Read property

Edit property

Archive property

### UNIT

Create unit

Assign tenant

Change status

### TENANT

Create tenant

View tenant

Update tenant

### LEASE

Create lease

View lease

Renew/terminate

### PAYMENT

Record payment

View payment

Generate receipt

### MAINTENANCE

Create request

Assign technician

Update status

Complete request

### DOCUMENT

Upload

View

Download

Delete according to permission

### MESSAGE

Send message

Receive realtime update

### COMMUNITY

Create announcement

View announcement

### ANALYTICS

Verify dashboard metrics are derived from database

### PWA

Manifest

Service worker

Installability

Offline fallback

---

# 101. FIRST-PREVIEW QUALITY GATE

Do not stop at "the UI looks good."

Before final preview, verify:

Frontend builds successfully.

Supabase client initializes.

Authentication works.

Database queries work.

RLS policies work.

CRUD works.

Storage works.

Realtime works where implemented.

Routes work.

Forms work.

Error handling works.

Mobile layout works.

Desktop layout works.

PWA files work.

No obvious console errors.

No missing imports.

No broken buttons.

No placeholder functionality.

No fake data inside application logic.

Seed/demo data comes from Supabase.

---

# 102. SELF-REPAIR LOOP

If something fails:

1. Identify the error.
2. Inspect the relevant file.
3. Fix it.
4. Run build/test again.
5. Repeat.

Do not stop after the first error.

Continue until the implementation reaches a clean build or until an external integration limitation genuinely prevents completion.

If blocked by an external credential or permission:

Implement everything possible around that boundary.

Clearly identify the exact remaining external setup requirement.

---

# 103. GITHUB FINALIZATION

After successful implementation:

Ensure repository contains:

src/

public/

supabase/

tests/

package.json

package-lock.json or chosen package manager lockfile

README.md

.env.example

PWA files

configuration files

Do not commit:

.env

.env.local

service-role keys

API secrets

private credentials

---

# 104. GIT COMMIT

Create a meaningful commit such as:

feat: implement RENFLIX full-stack property management PWA

If the connected GitHub integration allows commits and pushes:

Commit and push to the connected RENFLIX repository.

If it does not allow pushing:

Do not claim success.

Provide the exact files/state that need to be pushed manually.

---

# 105. FINAL APPLICATION STRUCTURE

The final application should have this conceptual architecture:

```
                     RENFLIX PWA
                          │
             ┌────────────┴────────────┐
             │                         │
         FRONTEND                  PWA LAYER
             │                         │
    React + TypeScript          Service Worker
    React Router                Manifest
    Tailwind                    Offline
             │
             ▼
         SUPABASE CLIENT
             │
   ┌─────────┼──────────┐
   │         │          │
  AUTH    DATABASE    STORAGE
   │         │          │
   │         │          ├─ Images
   │         │          ├─ Documents
   │         │          ├─ Receipts
   │         │          └─ Maintenance media
   │         │
   │         ├─ Organizations
   │         ├─ Properties
   │         ├─ Units
   │         ├─ Tenants
   │         ├─ Leases
   │         ├─ Payments
   │         ├─ Maintenance
   │         ├─ Expenses
   │         ├─ Community
   │         ├─ Messages
   │         └─ Analytics
   │
   ▼
   RLS
   │
   ▼
```

SECURE DATA ACCESS
│
├───────────────┐
▼               ▼
REALTIME       EDGE FUNCTIONS
│
┌─────┼─────┐
│     │     │
AI  Payments Notifications
│
▼
EXTERNAL
INTEGRATIONS

---

# 106. COMPLETE PRODUCT RESULT

The final RENFLIX application must allow:

OWNER

→ Create organization

→ Create portfolio

→ Add property

→ Add buildings/floors/units

→ Add tenants

→ Create leases

→ Generate rent schedule

→ Record payments

→ Track expenses

→ Manage maintenance

→ Manage documents

→ Communicate

→ Analyze portfolio

→ Receive intelligent recommendations

TENANT

→ Login

→ View home

→ View lease

→ View rent

→ Pay/record payment where supported

→ Submit maintenance

→ Upload photos

→ Track maintenance

→ View documents

→ Message manager

TECHNICIAN

→ Login

→ View assigned jobs

→ Accept

→ Start

→ Update

→ Upload photos

→ Complete

COMMUNITY MANAGER

→ Manage residents

→ Manage units

→ Announcements

→ Visitors

→ Amenities

→ Maintenance

→ Payments

ADMIN

→ Manage organizations

→ Users

→ Platform metrics

→ Subscriptions

→ System activity

---

# 107. FINAL REQUIREMENT

The first preview must demonstrate that RENFLIX is a real application rather than a prototype.

The user should be able to interact with the application and see data being persisted through Supabase.

The visual design must be creative, premium, modern, responsive and easy for everyone to understand.

The backend, database, authentication, storage, realtime features, RLS, PWA functionality and frontend must work together.

Do not leave important features as static placeholders.

Do not finish merely because the screens look complete.

Finish only after the application has been implemented, connected, built, tested and validated as far as the connected environment allows.

# RENFLIX

## Every Property. One Powerful Platform.

## Manage. Rent. Maintain. Grow.
