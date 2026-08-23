# StagePass

StagePass is a full-stack ticket booking application built with Next.js, Prisma, and PostgreSQL. It allows customers to browse events, hold seats temporarily, confirm bookings, manage tickets, cancel bookings, and join waitlists when a seat category is sold out.

The application uses Supabase PostgreSQL as the database and is designed for deployment on Vercel.

## Features

* Customer account registration and login
* Organiser account registration and login
* Event listing and seat selection UI
* Standard and Premium seat categories
* 10-minute temporary seat holds
* Booking confirmation
* QR ticket generation
* Ticket cancellation and immediate seat release
* FIFO waitlist for sold-out seat categories
* Email notifications for booking confirmations
* Waitlist seat-offer emails
* Organiser dashboard for listings and summary information
* Ticketmaster API integration
* Redis support for temporary seat-hold mirroring
* Session-based authentication and protected routes

## Tech Stack

* Next.js 14 App Router
* React 18
* TypeScript
* Tailwind CSS
* Prisma ORM
* PostgreSQL
* Supabase
* Vercel
* Redis / Upstash Redis
* Resend
* Ticketmaster API
* jose JWT authentication
* bcryptjs
* qrcode
* date-fns

## Project Architecture

```text
.
├── app/
│   ├── api/
│   │   ├── auth/
│   │   ├── bookings/
│   │   ├── events/
│   │   ├── holds/
│   │   ├── shows/
│   │   ├── venues/
│   │   └── waitlist/
│   ├── account/
│   ├── admin/
│   ├── checkout/
│   ├── login/
│   ├── organiser/
│   ├── register/
│   ├── shows/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── organiser-dashboard.tsx
│   ├── seat-map.tsx
│   ├── show-card.tsx
│   ├── footer.tsx
│   ├── header.tsx
│   └── ui/
├── lib/
│   ├── auth.ts
│   ├── booking.ts
│   ├── email.ts
│   ├── holds.ts
│   ├── prisma.ts
│   ├── qr.ts
│   ├── redis.ts
│   ├── utils.ts
│   └── waitlist.ts
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── middleware.ts
├── package.json
└── ...
```

## Database

StagePass originally used SQLite for local development but now uses PostgreSQL hosted on Supabase.

Prisma is used as the ORM for all database operations.

The Prisma datasource is configured as:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

`DATABASE_URL` uses the Supabase transaction pooler and is intended for application runtime connections.

`DIRECT_URL` uses the Supabase session pooler and is used by Prisma for schema operations such as `prisma db push`.

## Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/leop3025/stagepass.git
cd stagepass
```

### 2. Install dependencies

```bash
npm install
```

On Windows PowerShell, if script execution is disabled, use:

```powershell
npm.cmd install
```

### 3. Create the environment file

Create a `.env` file in the root directory.

Example:

```env
DATABASE_URL="postgresql://postgres.PROJECT_ID:PASSWORD@SUPABASE_POOLER:6543/postgres?pgbouncer=true"

DIRECT_URL="postgresql://postgres.PROJECT_ID:PASSWORD@SUPABASE_POOLER:5432/postgres"

AUTH_SECRET="replace-with-a-long-random-string"

CRON_SECRET="replace-with-a-long-random-string"

TICKETMASTER_API_KEY="your-ticketmaster-api-key"

RESEND_API_KEY="re_your_resend_api_key"

EMAIL_FROM="StagePass <onboarding@resend.dev>"

APP_URL="http://localhost:3000"

# Optional Redis configuration
# UPSTASH_REDIS_REST_URL=""
# UPSTASH_REDIS_REST_TOKEN=""
```

Do not commit `.env` to GitHub.

Sensitive values such as database passwords, API keys, and authentication secrets must remain private.

## Supabase Setup

Create a Supabase project and obtain the Prisma connection strings from:

```text
Supabase Dashboard
→ Connect
→ ORM
→ Prisma
```

Supabase provides two connection strings.

### Runtime connection

```env
DATABASE_URL="postgresql://...:6543/postgres?pgbouncer=true"
```

This uses Supabase's transaction-mode connection pooler.

### Prisma direct connection

```env
DIRECT_URL="postgresql://...:5432/postgres"
```

This is used for Prisma schema operations.

If the database password contains special URL characters such as `@`, `#`, `%`, `/`, or `:`, they must be URL encoded inside the connection string.

## Prisma Setup

Generate the Prisma client:

```bash
npx prisma generate
```

On Windows PowerShell:

```powershell
npx.cmd prisma generate
```

Push the schema to Supabase:

```bash
npx prisma db push
```

or:

```powershell
npx.cmd prisma db push
```

A successful command should report that the database is in sync with the Prisma schema.

## Database Seeding

The project contains:

```text
prisma/seed.ts
```

The seed command is configured in `package.json`:

```json
"prisma": {
  "seed": "ts-node prisma/seed.ts"
}
```

Run:

```bash
npx prisma db seed
```

On Windows PowerShell:

```powershell
npx.cmd prisma db seed
```

The seed script creates sample StagePass data including:

* Admin user
* Organiser user
* Customer user
* Venues
* Seats
* Shows
* Show-specific seat inventory

Example development accounts:

```text
Admin
admin@stagepass.test
Admin123!

Organiser
organiser@stagepass.test
Organiser123!

Customer
veena@stagepass.test
Customer123!
```

The seed script deletes existing application records before recreating the sample data, so it should be used carefully once real production data exists.

## Run the Application Locally

```bash
npm run dev
```

On Windows PowerShell:

```powershell
npm.cmd run dev
```

Then open:

```text
http://localhost:3000
```

## Environment Variables

### Required

```env
DATABASE_URL=""
DIRECT_URL=""
AUTH_SECRET=""
CRON_SECRET=""
TICKETMASTER_API_KEY=""
```

### Email configuration

```env
RESEND_API_KEY=""
EMAIL_FROM="StagePass <onboarding@resend.dev>"
```

`RESEND_API_KEY` is required for real email delivery.

Without a valid Resend API key, the application falls back to mock email logging.

For example:

```text
[email:mock] Your tickets for Event Name → customer@example.com
```

### Application URL

For local development:

```env
APP_URL="http://localhost:3000"
```

For production, this should be replaced with the deployed Vercel URL.

Example:

```env
APP_URL="https://stagepass.vercel.app"
```

### Optional Redis configuration

```env
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""
```

Redis is used for temporary hold mirroring and related seat-hold operations.

## Email Delivery

StagePass uses Resend to send booking confirmation and waitlist notification emails.

Booking confirmation emails include:

* Customer name
* Show title
* Show date and time
* Venue
* Selected seats
* Booking reference
* QR ticket

During Resend testing mode, emails can normally only be sent to the email address associated with the Resend account.

To send emails to arbitrary customers, a custom domain must be verified with Resend and `EMAIL_FROM` must use that verified domain.

Example production configuration:

```env
EMAIL_FROM="StagePass <tickets@yourdomain.com>"
```

## API Overview

### Authentication

#### POST `/api/auth/register`

Creates a user account.

Supported roles include:

```text
CUSTOMER
ORGANISER
```

#### POST `/api/auth/login`

Validates credentials and creates the authenticated session.

#### POST `/api/auth/logout`

Clears the authentication cookie.

#### GET `/api/auth/me`

Returns information about the authenticated user.

## Booking Endpoints

### GET `/api/bookings`

Returns the authenticated customer's booking history.

### POST `/api/bookings`

Confirms active seat holds and creates a booking.

The booking process:

```text
Active Hold
    ↓
Validate Seats
    ↓
Create Booking
    ↓
HELD → BOOKED
    ↓
Generate Booking Reference
    ↓
Generate QR Code
    ↓
Delete Hold
    ↓
Send Confirmation Email
```

### DELETE `/api/bookings`

Cancels a booking and releases booked seats.

Released seats may then be offered to users in the waitlist.

## Hold Endpoints

### POST `/api/holds`

Creates temporary seat holds for an authenticated customer.

### GET `/api/holds`

Returns active holds belonging to the authenticated user.

### DELETE `/api/holds`

Releases a current seat hold.

## Show and Seat Endpoints

### GET `/api/shows`

Returns available shows.

### GET `/api/shows/[id]`

Returns details for a specific show.

### GET `/api/shows/[id]/seats`

Returns the seat inventory and current state for the selected show.

Possible seat states include:

```text
AVAILABLE
HELD
BOOKED
```

The seat endpoint also handles stale hold cleanup before returning availability data.

## Waitlist Endpoints

### POST `/api/waitlist`

Adds a customer to the waitlist for a specified seat category.

### GET `/api/waitlist?showId=...`

Returns queue information for Standard and Premium waitlists.

## Database Schema

The primary Prisma models are:

```text
User
Venue
Seat
Show
ShowSeat
Hold
Booking
BookingSeat
WaitlistEntry
```

### User

Stores customer, organiser, and admin accounts.

```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  name         String
  role         String
  createdAt    DateTime @default(now())
}
```

### Show

Stores event and show information.

```prisma
model Show {
  id            String   @id @default(cuid())
  title         String
  description   String
  kind          String
  genre         String
  venueId       String
  organiserId   String
  startsAt      DateTime
  durationMin   Int
  premiumPrice  Int
  standardPrice Int
  createdAt     DateTime @default(now())
}
```

### ShowSeat

Represents a physical seat for a particular show.

```prisma
model ShowSeat {
  id         String @id @default(cuid())
  showId     String
  seatId     String
  category   String
  priceCents Int
  status     String

  @@unique([showId, seatId])
  @@index([showId, status, category])
}
```

### Hold

Stores temporary customer seat holds.

```prisma
model Hold {
  id         String   @id @default(cuid())
  userId     String
  showSeatId String   @unique
  expiresAt  DateTime
  createdAt  DateTime @default(now())
}
```

### Booking

Stores confirmed or cancelled ticket bookings.

```prisma
model Booking {
  id        String   @id @default(cuid())
  reference String   @unique
  userId    String
  showId    String
  status    String
  qrDataUrl String?
  createdAt DateTime @default(now())
}
```

### BookingSeat

Associates booked seats with bookings.

```prisma
model BookingSeat {
  id         String @id @default(cuid())
  bookingId  String
  showSeatId String @unique
}
```

### WaitlistEntry

Stores FIFO waitlist positions and seat offers.

```prisma
model WaitlistEntry {
  id             String    @id @default(cuid())
  userId         String
  showId         String
  category       String
  status         String
  offerToken     String?   @unique
  offerExpiresAt DateTime?
  offeredSeatId  String?
  createdAt      DateTime  @default(now())

  @@index([showId, category, status, createdAt])
}
```

## Seat Hold Lifecycle

When a customer selects a seat:

```text
AVAILABLE
    ↓
Customer selects seat
    ↓
Backend validates availability
    ↓
Seat becomes HELD
    ↓
Hold record created
    ↓
10-minute expiration timer
```

If checkout succeeds:

```text
HELD → BOOKED
```

If the hold expires:

```text
HELD → AVAILABLE
```

This prevents multiple customers from booking the same seat.

## Booking Logic

Booking confirmation is handled transactionally.

The system:

1. Retrieves the customer's active holds.
2. Ensures all held seats belong to the same show.
3. Generates a unique booking reference.
4. Generates a QR code.
5. Creates the booking record.
6. Converts each held seat from `HELD` to `BOOKED`.
7. Creates `BookingSeat` records.
8. Deletes the temporary holds.
9. Clears Redis hold mirrors when configured.
10. Sends the booking confirmation email.

## Cancellation Logic

When a confirmed booking is cancelled:

1. Booking status changes to `CANCELLED`.
2. Associated seats are changed back to `AVAILABLE`.
3. Booking-seat associations are removed.
4. Released seats are passed to the waitlist system.
5. Eligible waiting customers may receive a temporary seat offer.

## Waitlist Logic

StagePass uses separate queues for:

```text
STANDARD
PREMIUM
```

The waitlist follows FIFO ordering.

```text
Seat becomes available
        ↓
Find earliest WAITING entry
        ↓
Generate offer token
        ↓
Reserve seat temporarily
        ↓
Send claim email
        ↓
Customer accepts OR offer expires
```

If an offer expires, the seat can be offered to the next eligible customer.

## Ticketmaster Integration

StagePass includes a Ticketmaster API integration.

Configure:

```env
TICKETMASTER_API_KEY="your-ticketmaster-api-key"
```

The API key should never be committed to GitHub.

If a key is accidentally exposed publicly, revoke or rotate it from the Ticketmaster developer portal.

## Deployment with Vercel

StagePass is designed to be deployed using Vercel.

### 1. Push the project to GitHub

```bash
git add .
git commit -m "Update StagePass"
git push
```

### 2. Import the GitHub repository into Vercel

Recommended Vercel settings:

```text
Framework Preset: Next.js
Root Directory: ./
Build Command: Default
Install Command: Default
Output Directory: Default
```

### 3. Add environment variables in Vercel

Add:

```text
DATABASE_URL
DIRECT_URL
AUTH_SECRET
CRON_SECRET
TICKETMASTER_API_KEY
RESEND_API_KEY
EMAIL_FROM
APP_URL
```

Do not upload `.env` to GitHub.

### 4. Deploy

Vercel will build and deploy the Next.js application.

After deployment, Vercel provides a production URL similar to:

```text
https://stagepass.vercel.app
```

Set:

```env
APP_URL="https://your-stagepass-deployment.vercel.app"
```

in Vercel's environment variables and redeploy if required.

## Typical User Flow

1. Register or log in as a customer.
2. Browse available shows.
3. Open the seat map.
4. Select available seats.
5. Create temporary holds.
6. Continue to checkout.
7. Confirm the booking.
8. Receive a unique booking reference.
9. Receive a QR ticket.
10. View the booking under the account page.
11. Cancel the booking if required.
12. Join a category waitlist when seats are sold out.

## Typical Organiser Flow

1. Register or log in as an organiser.
2. Access the organiser dashboard.
3. View organiser-specific listings.
4. Manage show information and summary data.
5. Monitor event and booking activity.

## Troubleshooting

### PowerShell blocks `npm` or `npx`

If Windows displays:

```text
running scripts is disabled on this system
```

use:

```powershell
npm.cmd
```

instead of:

```powershell
npm
```

and:

```powershell
npx.cmd
```

instead of:

```powershell
npx
```

Example:

```powershell
npx.cmd prisma generate
npx.cmd prisma db push
npm.cmd run dev
```

### Prisma `EPERM` error

If Prisma reports an error involving:

```text
query_engine-windows.dll.node
```

a Node process may be locking the Prisma engine.

Stop the development server and run:

```powershell
taskkill /F /IM node.exe
```

Then regenerate Prisma:

```powershell
npx.cmd prisma generate
```

### Prisma authentication error

If Prisma reports:

```text
P1000: Authentication failed
```

verify:

* Supabase database password
* `DATABASE_URL`
* `DIRECT_URL`
* Database username
* Connection pooler host
* URL encoding of special password characters

### Email not delivered

Verify:

```env
RESEND_API_KEY
EMAIL_FROM
```

Also check the Resend dashboard for API and delivery errors.

When using `onboarding@resend.dev`, testing restrictions may prevent emails from being sent to arbitrary recipients.

### Shows are missing

Verify that the PostgreSQL database has been seeded:

```powershell
npx.cmd prisma db seed
```

Also verify the show start dates have not already passed if the frontend filters past events.

### Database tables are missing

Run:

```powershell
npx.cmd prisma db push
```

Then inspect the Supabase Table Editor.

### Seat remains held

Verify the hold expiry logic and stale-hold cleanup process.

Redis may also contain hold mirrors when Upstash Redis is configured.

## Security Notes

Never commit the following to GitHub:

```text
.env
Database passwords
AUTH_SECRET
CRON_SECRET
TICKETMASTER_API_KEY
RESEND_API_KEY
Redis credentials
```

Use `.env` locally and Vercel Environment Variables in production.

If any API key is accidentally exposed, revoke it and generate a replacement.

## Current Deployment Architecture

```text
Customer Browser
       │
       ▼
Vercel
Next.js Application
       │
       ├──────────────► Ticketmaster API
       │
       ├──────────────► Resend Email API
       │
       ├──────────────► Upstash Redis (optional)
       │
       ▼
Prisma ORM
       │
       ▼
Supabase PostgreSQL
```

## Current Development Status

StagePass currently supports the core ticket-booking workflow:

```text
Authentication
    ↓
Show Browsing
    ↓
Seat Selection
    ↓
Temporary Hold
    ↓
Checkout
    ↓
Booking
    ↓
QR Ticket
    ↓
Email Confirmation
    ↓
Cancellation / Waitlist
```

The application is configured to use Supabase PostgreSQL instead of the previous local SQLite database and can be deployed as a full-stack Next.js application using Vercel.
