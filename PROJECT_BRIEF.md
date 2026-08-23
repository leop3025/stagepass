# StagePass Project Brief

## 1. Overview

StagePass is a Next.js-based ticket-booking platform for live shows and events. The app supports customer sign-up, seat selection, short-duration holds, booking confirmation, cancellation with a convenience fee, QR-based ticket delivery, and organiser access for managing listings and revenue.

The project is designed to behave like a real ticketing flow rather than a static demo: it enforces seat availability rules, introduces waitlists for sold-out categories, and keeps customer bookings tied to real seat assignments.

## 2. Project Goals

- Allow customers to browse events and choose seats
- Hold selected seats for a limited time before checkout
- Prevent duplicate holds or bookings for the same seat
- Confirm bookings and generate a QR-coded ticket reference
- Keep booking history available to the logged-in customer
- Permit cancellation with a convenience charge and immediate seat release
- Support organiser dashboard functionality for event and venue management
- Support FIFO waitlist behavior for sold-out Premium and Standard seats
- Send email alert notifications for booking and waitlist offers

## 3. Tech Stack

- Next.js 14 App Router
- React 18
- TypeScript
- Tailwind CSS
- Prisma ORM
- SQLite for local development
- JWT cookie-based auth using jose
- bcryptjs for password hashing
- Upstash Redis integration for hold mirrors
- Resend for transactional email delivery
- qrcode for QR ticket generation
- Ticketmaster API data import support

## 4. High-Level Architecture

### Frontend
- UI and routes are inside the app/ directory
- Shared UI logic and reusable presentational components live in components/
- The seat map is the critical real-time UI for availability and hold timing

### Backend and API Layer
- app/api contains customer, organiser, auth, and booking routes
- server-side business rules live in lib/
- auth checks, session validation, and route protection live in middleware.ts and lib/auth.ts

### Data Layer
- Prisma schema defines users, venues, seats, show seats, holds, bookings, waitlist entries, and organiser data
- SQLite is the default database for development and local testing
- Prisma handles relational integrity and transactional seat-state updates

## 5. Core Features

### Authentication and Roles
- Customer login + registration
- Organiser login + registration
- Role-based access in middleware for customer vs organiser routes
- Session cookie-based authentication

### Event and Seat Flows
- Shows are loaded from the app and/or external Ticketmaster-style data
- Seat states are tracked as AVAILABLE, HELD, or BOOKED
- A 10-minute hold timer is enforced for selected seats
- Bookings create a unique reference and QR payload

### Booking and Cancellation
- Booking creation confirms seats from active holds
- Seats are immediately released when a booking is cancelled
- A convenience fee is applied on cancellation
- BookingSeat links are cleared so the seat no longer appears as occupied

### Waitlist Logic
- Standard and Premium waitlists are tracked separately
- The queue is processed in FIFO order
- If a seat becomes free, the earliest waiting user receives an offer
- Offer expiry is time-limited, and the next user in the queue advances automatically
- Queue counts are shown in the seat map UI

## 6. Key Directory Structure

```text
.
├── app/
│   ├── account/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/
│   │   │   ├── logout/
│   │   │   ├── me/
│   │   │   └── register/
│   │   ├── bookings/
│   │   ├── holds/
│   │   ├── shows/
│   │   │   ├── [id]/
│   │   │   │   ├── seats/
│   │   │   └── route.ts
│   │   ├── venues/
│   │   └── events/
│   ├── checkout/
│   ├── login/
│   ├── organiser/
│   ├── register/
│   ├── shows/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── footer.tsx
│   ├── header.tsx
│   ├── seat-map.tsx
│   ├── show-card.tsx
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
├── .env.example
├── .env
├── next.config.mjs
├── next-env.d.ts
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── PROJECT_BRIEF.md
├── README.md
└── ...
```

## 7. Database Schema Summary

The Prisma schema captures the primary ticketing domain models:

- User: customer, organiser, admin accounts
- Venue: venue metadata and seat inventory
- Seat: physical seat definition under a venue
- Show: event listing with timing and pricing
- ShowSeat: availability of a particular physical seat for a specific show
- Hold: temporary seat reservation with expiry timestamp
- Booking: final confirmed reservation with unique reference
- BookingSeat: mapping between a booking and its seats
- WaitlistEntry: queue record for sold-out category seats

## 8. Seat Hold and Booking Logic

### Hold flow
1. Customer selects one or more seats from the show seat map.
2. The app verifies that all chosen seats are still AVAILABLE.
3. A database transaction updates them to HELD.
4. A hold record is created with an expiry timestamp.
5. The seat is visually marked as held while the user continues to checkout.

### Booking confirmation
1. Active holds for the current customer are collected.
2. The system validates all seats are still in HELD state.
3. The seats are then marked BOOKED.
4. A Booking record is created with a unique reference.
5. A QR code is generated from the reference and attached to the booking record.
6. The customer receives a confirmation email.

### Cancellation and release
1. A customer cancels a confirmed booking.
2. The booking status becomes CANCELLED.
3. Each seat is reset to AVAILABLE.
4. BookingSeat mappings are removed.
5. The seat is re-offered through the waitlist if needed.

## 9. Waitlist Logic

The seat inventory supports sold-out category waitlists with FIFO queue ordering.

- The app tracks waitlist entries per show and category (STANDARD, PREMIUM).
- Any seat released by expiry, cancellation, or manual release triggers a queue check.
- The earliest waiting user for that category is offered the seat.
- A short expiry window is used for the seat offer.
- If the offer expires, the system moves to the next user in the queue.

This means customers are served in the same order they joined the waitlist for that category.

## 10. Email and Ticketing

- Resend is used for email delivery when a valid API key is configured.
- QR tickets are generated using the booking reference.
- Email templates include title, time, venue, seat list, booking reference, and QR image.
- The ticket payload is encoded with a consistent reference pattern so it can be scanned and matched at entry.

## 11. Security and Route Protection

- Cookies are used for authenticated user sessions.
- Protected routes such as /account, /checkout, /organiser, and /admin enforce access rules.
- Organiser and customer portals are intentionally separated to avoid role confusion.

## 12. Local Setup Notes

This project is meant to run locally with minimal external dependencies. SQLite and local env configuration are sufficient for development, while email and Redis can be enabled as needed for production-like behavior.

## 13. Suggested Next Improvements

- Add richer organiser analytics dashboards
- Add real payment gateway integration
- Support event creation from organiser UI with category pricing
- Improve email templates and ticket rendering
- Add stronger concurrency checks for large-scale multi-user traffic
