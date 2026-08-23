# StagePass

StagePass is a full-stack ticket booking application built with Next.js, Prisma, and SQLite. It lets customers browse events, hold seats, confirm bookings, manage tickets, and join waitlists when a seat category is sold out.

## Features

- Customer account registration and login
- Organiser account registration and login
- Event listing and seat selection UI
- 10-minute temporary seat holds
- Booking confirmation and QR ticket generation
- Ticket cancellation with a convenience fee
- FIFO waitlist for sold-out Standard/Premium seats
- Email notifications for tickets and waitlist offers
- Organiser dashboard for listings and summary data

## Tech Stack

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- Prisma ORM
- SQLite
- Redis (for hold mirroring / queue support)
- React
- Resend
- jose JWT auth
- bcryptjs
- qrcode

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create environment file

Copy the sample configuration and adjust values as needed:

```bash
cp .env.example .env
```

### 3. Configure the database

The app uses SQLite by default:

```env
DATABASE_URL="file:./dev.db"
AUTH_SECRET="replace-with-a-long-random-string"
CRON_SECRET="replace-with-a-long-random-string"
APP_URL="http://localhost:3000"
```

### 4. Generate Prisma client and database

```bash
npx prisma generate
npx prisma db push
```

Optional: seed the database if needed.

```bash
npx prisma db seed
```

### 5. Run the app

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

## Environment Variables

Example values in [.env.example](.env.example):

```env
DATABASE_URL="file:./dev.db"
AUTH_SECRET="replace-with-a-long-random-string"
CRON_SECRET="replace-with-a-long-random-string"
APP_URL="http://localhost:3000"

RESEND_API_KEY="re_..."
EMAIL_FROM="StagePass <tickets@yourdomain.com>"
```

Notes:
- `RESEND_API_KEY` is required for actual email delivery.
- `EMAIL_FROM` must be a verified sender in Resend.
- Without a valid Resend setup, the app logs mock email output instead of delivering real messages.

## API Overview

### Auth endpoints

- POST /api/auth/register
  - Creates a user account
  - Supports CUSTOMER and ORGANISER roles
- POST /api/auth/login
  - Validates credentials and sets the session cookie
- POST /api/auth/logout
  - Clears the auth cookie
- GET /api/auth/me
  - Returns current authenticated user info

### Booking endpoints

- GET /api/bookings
  - Returns the logged-in customer’s booking history
- POST /api/bookings
  - Confirms holds and creates the booking
- DELETE /api/bookings
  - Cancels a booking and releases booked seats immediately

### Hold endpoints

- POST /api/holds
  - Holds one or more seats for a customer
- DELETE /api/holds
  - Releases a currently held seat
- GET /api/holds
  - Returns active holds for the logged-in user

### Seat endpoints

- GET /api/shows/[id]/seats
  - Returns seat state, mine/held state, and expiry data for a show
- Ensures seat catalog population and stale hold cleanup before returning data

### Waitlist endpoints

- POST /api/waitlist
  - Adds a user to the waitlist for a show category
- GET /api/waitlist?showId=...
  - Returns current queue counts for Standard/Premium waitlists

## Database Schema

Key Prisma models:

```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  name         String
  role         String
  createdAt    DateTime @default(now())
}

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
}

model ShowSeat {
  id         String  @id @default(cuid())
  showId     String
  seatId     String
  category   String
  priceCents Int
  status     String

  @@unique([showId, seatId])
}

model Hold {
  id         String   @id @default(cuid())
  userId     String
  showSeatId String   @unique
  expiresAt  DateTime
}

model Booking {
  id        String   @id @default(cuid())
  reference String   @unique
  userId    String
  showId    String
  status    String
  qrDataUrl String?
}

model BookingSeat {
  id         String   @id @default(cuid())
  bookingId  String
  showSeatId String   @unique
}

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
}
```

## Seat Hold, Booking, and Waitlist Logic

### Seat hold lifecycle
- A customer selects available seats.
- The backend validates that each seat is still AVAILABLE.
- The backend updates the seat status to HELD inside a transaction.
- A hold record is created with expiry time.
- If the customer does not confirm within the hold period, the hold expires and the seat is released automatically.

### Booking logic
- Active holds are converted to a confirmed booking.
- The system updates the seat states to BOOKED.
- A unique booking reference is created.
- A QR code is generated using that reference.
- The customer receives an email with the ticket information.

### Waitlist logic
- Standard and Premium categories have separate waitlists.
- Customers join the queue when no seats are available in that category.
- New seats are assigned on a FIFO basis.
- When a seat is released, the first waiting customer is offered it.
- If the offer expires, the next queued user is selected.
- Queue counts are visible in the seat map.

## Development Notes

- SQLite is used for local development convenience.
- Workflow assumes a single local dev environment unless configured otherwise.
- The app has a modular structure so auth, booking, email, hold, and waitlist behavior can be extended independently.

## Typical Local Flow

1. Create customer account
2. Open show seat map
3. Hold desired seat(s)
4. Continue to checkout and confirm booking
5. View booking under My tickets
6. Receive email with ticket QR code
7. If sold out, join the category waitlist and wait for FIFO assignment

## Troubleshooting

- If email is not delivered, verify `RESEND_API_KEY` and `EMAIL_FROM` in [.env](.env)
- If the app shows seat errors, ensure the local database has been initialized with Prisma
- If a seat remains stuck, clear stale holds by restarting the app and running the stale expiration flow
