# System Design Write-up

## Overview

StagePass is a ticket-booking system designed for live events and shows where seat inventory must remain accurate under concurrent customer demand. The core challenge is not simply displaying seats, but enforcing a single source of truth for availability, holds, bookings, and waitlist assignments while keeping the user experience responsive.

The application uses a Next.js backend with Prisma and SQLite for development, plus Redis-backed hold tracking for temporary state and queue management. The system treats seat holds as short-lived reservations, bookings as final confirmations, and waitlist entries as queued requests for any seat that becomes available later.

## 1. Seat hold and TTL mechanism

Seat inventory is modeled as show-specific seat records with an explicit status such as AVAILABLE, HELD, or BOOKED. When a customer selects seats, the application validates that each seat is still available before creating a temporary hold. This validation occurs inside a transactional database operation so that status changes are consistent and atomic.

Each hold includes an expiry timestamp. The TTL is usually short, such as 10 minutes, which balances customer flexibility with product integrity. The hold expires automatically if the user does not confirm the booking in time. Once expiry occurs, the seat is released back to AVAILABLE and is eligible for resale or re-offering to a waitlist user.

A separate stale-hold cleanup path checks for expired rows and resets them. This ensures the system does not keep seats stuck in a held state after the user navigates away or the browser loses connection. In practice, the application combines transactional seat updates with a time-based expiry check to preserve accurate seat state without keeping users waiting indefinitely.

## 2. Concurrency prevention

Concurrency is the highest-risk area in seat-booking systems because multiple users may attempt to claim the same seat at the same time. To prevent double-booking, the application relies on transactional updates at the database layer. Each seat is checked and updated in one logical unit so two simultaneous transactions cannot both transition the same seat from AVAILABLE to HELD or BOOKED.

The crucial invariant is: a seat cannot be both held and booked by two different users. This is enforced by conditionally updating rows that match the expected status, and by throwing an error if the affected row count is not exactly one. When a race condition occurs, one transaction wins and the other gets a seat unavailable error.

The same principle is used for booking confirmation. Once a hold exists, the booking flow validates the hold ownership and then updates the seat state to BOOKED inside the same transaction. This prevents the classic problem where one user reserves a seat and another is allowed to confirm it before the first transaction finishes.

## 3. Waitlist auto-assignment flow

When a category is sold out, the application supports a waitlist rather than simply rejecting customers. Waitlist entries are created by show and category, and maintain a FIFO ordering. This means users are served in the same order they joined the queue for that category.

When a seat becomes free due to cancellation or expiry, the system triggers a queue check for that category. The earliest active waitlist entry is selected, and the system generates a time-limited seat offer. These offers are kept short-lived to avoid leaving seats blocked in a stale queue state.

The waiting user receives an email or in-app notification prompting them to claim the seat. If they accept within the offer window, the seat is allocated to them and the workflow continues as a normal booking. If the offer expires, the system moves to the next user in the queue automatically. This ensures fairness and prevents a seat from remaining empty indefinitely.

## 4. Time-limited offer handling

Time-limited offers require careful state management because they introduce additional lifecycle transitions beyond simple holds and bookings. The queue assignment is not permanent; it is an invitation to accept an available seat under a strict expiry.

When an offer is generated, the application records the waitlist entry state, expiration timestamp, and the offer token. If the user confirms within the window, the system validates the token and converts the pending offer into a real booking. If the user does not respond in time, the offer expires and the next user is offered the seat.

This design prevents stale offers from consuming inventory forever and keeps the waitlist moving. It also keeps the user experience predictable: the customer sees a clear time limit and can act quickly, while the system maintains queue fairness behind the scenes.

## 5. Booking and cancellation consistency

Bookings are confirmed only after all seat states have been validated and updated. Once confirmed, a unique booking reference is generated and a QR code is created. The QR is used as a portable ticket representation so a ticket can be validated at entry even if the email did not arrive.

Cancellation follows the inverse process. A booking is marked CANCELLED and the associated seats are reset to AVAILABLE. BookingSeat links are removed immediately so the seat is no longer treated as occupied. After release, the system re-checks the waitlist queue and can assign the freed seat to the next qualified customer.

This is important because it makes the system consistent from both the customer and operational perspective. The seat inventory reflects the state change immediately, and the waitlist moves as soon as the inventory changes.

## 6. Why this design works

The system is designed around a simple rule: seat state transitions are atomic, user actions are time-bounded, and queue decisions are deterministic. By using database transactions for inventory changes and TTL-based expiry for temporary holds and offers, the platform can support real customer demand without violating seat integrity.

At the same time, queue-based allocation ensures fairness for sold-out categories and prevents the platform from wasting inventory or leaving seats empty. The combination of transactional locking, time-bounded hold state, and FIFO waitlist assignment provides the foundation for a reliable ticketing flow.
