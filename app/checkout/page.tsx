"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

type HoldSeat = {
  id: string;
  showSeatId: string;
  expiresAt: string;
  showSeat: {
    id: string;
    seat: {
      row: string;
      number: number;
    };
    category: string;
    priceCents: number;
    show: {
      title: string;
      startsAt: string;
      venue: {
        name: string;
        city: string;
      };
    };
  };
};

type BookingResult = {
  id: string;
  reference: string;
  status: string;
  createdAt: string;
  qrDataUrl?: string | null;
  show: {
    title: string;
    venue: {
      name: string;
      city: string;
    };
  };
  seats: {
    showSeat: {
      seat: {
        row: string;
        number: number;
      };
    };
  }[];
};

export default function CheckoutPage() {
  const router = useRouter();
  const [holds, setHolds] = useState<HoldSeat[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<BookingResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function loadHolds() {
    try {
      const res = await fetch("/api/holds", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Unable to load your holds");
      }
      setHolds(data.holds ?? []);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load your holds");
      setHolds([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadHolds();
  }, []);

  const total = useMemo(
    () => holds.reduce((sum, hold) => sum + hold.showSeat.priceCents, 0),
    [holds]
  );

  async function handleBookNow() {
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/bookings", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Booking failed");
      }

      setBooking(data.booking);
      setHolds([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (booking) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-white">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-300">
          Booking confirmed
        </p>
        <h1 className="mt-4 font-display text-4xl text-cream">Tickets reserved</h1>

        <div className="mt-6 space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p>
            <span className="text-cream/50">Reference:</span>{" "}
            <span className="font-semibold text-gold">{booking.reference}</span>
          </p>
          <p>
            <span className="text-cream/50">Event:</span>{" "}
            <span className="text-cream">{booking.show.title}</span>
          </p>
          <p>
            <span className="text-cream/50">Venue:</span>{" "}
            <span className="text-cream">{booking.show.venue.name}, {booking.show.venue.city}</span>
          </p>
          <p>
            <span className="text-cream/50">Seats:</span>{" "}
            <span className="text-cream">
              {booking.seats
                .map((seat) => `${seat.showSeat.seat.row}${seat.showSeat.seat.number}`)
                .join(", ")}
            </span>
          </p>
        </div>

        {booking.qrDataUrl && (
          <div className="mt-6 rounded-2xl border border-amber-400/25 bg-amber-500/5 p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <img
                src={booking.qrDataUrl}
                alt="Booking ticket QR code"
                className="h-32 w-32 rounded-xl border border-white/10 bg-white p-2"
              />
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-300">
                  Save your QR ticket
                </p>
                <p className="mt-2 text-sm text-amber-100/80">
                  Email sending is restricted to the testing address. Please take a screenshot of this QR code and keep it ready to show at the venue.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <Button onClick={() => router.push("/")}>Back to shows</Button>
          <Button variant="secondary" onClick={() => router.push("/account")}>
            View bookings
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-white">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gold">Checkout</p>
          <h1 className="mt-2 font-display text-4xl text-cream">Review your booking</h1>
        </div>
        <Link href="/" className="text-sm text-cream/60 hover:text-cream">
          ← Back to events
        </Link>
      </div>

      {loading ? (
        <p className="mt-8 text-cream/60">Loading your active holds...</p>
      ) : holds.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-cream/70">
          <p>You do not have any active seat holds.</p>
          <Button className="mt-4" onClick={() => router.push("/")}>Browse shows</Button>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="font-display text-2xl text-cream">Selected seats</h2>

            <div className="mt-5 space-y-3">
              {holds.map((hold) => (
                <div key={hold.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/10 px-4 py-3">
                  <div>
                    <p className="font-medium text-cream">
                      {hold.showSeat.seat.row}{hold.showSeat.seat.number}
                    </p>
                    <p className="text-xs text-cream/50">
                      {hold.showSeat.category.toLowerCase()} · {hold.showSeat.show.venue.name}
                    </p>
                  </div>
                  <p className="font-medium text-gold">{formatCurrency(hold.showSeat.priceCents)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-gold/20 bg-gold/5 p-5">
            <p className="text-sm uppercase tracking-[0.25em] text-gold">Summary</p>
            <div className="mt-4 space-y-3 text-sm text-cream/70">
              <div className="flex justify-between">
                <span>Seats</span>
                <span>{holds.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(total)}</span>
              </div>
              <div className="flex justify-between">
                <span>Fees</span>
                <span>$0.00</span>
              </div>
            </div>

            <div className="mt-4 border-t border-white/10 pt-4">
              <div className="flex justify-between font-semibold text-cream">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            <Button className="mt-6 w-full" onClick={handleBookNow} disabled={submitting}>
              {submitting ? "Confirming..." : "Book now"}
            </Button>
          </div>
        </div>
      )}

      {error && <p className="mt-5 text-sm text-rose-300">{error}</p>}
    </div>
  );
}
