"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

type Booking = {
  id: string;
  reference: string;
  status: string;
  createdAt: string;
  show: {
    title: string;
    startsAt: string;
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
      category: string;
      priceCents: number;
    };
  }[];
};

export default function AccountPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function load() {
    try {
      const res = await fetch("/api/bookings", { cache: "no-store" });
      const data = await res.json();

      if (res.status === 401 || res.status === 403) {
        window.location.href = "/login?next=/account";
        return;
      }

      if (!res.ok) throw new Error(data.error || "Unable to load bookings");
      setBookings(data.bookings ?? []);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleCancel(booking: Booking) {
    const subtotal = booking.seats.reduce((sum, seat) => sum + seat.showSeat.priceCents, 0);
    const convenienceFee = Math.max(500, Math.round(subtotal * 0.05));
    const confirmed = window.confirm(
      `Cancel this booking? A convenience fee of ${formatCurrency(convenienceFee)} will be charged.`
    );

    if (!confirmed) return;

    setCancelingId(booking.id);
    setMessage("");

    try {
      const res = await fetch("/api/bookings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to cancel booking");

      setMessage(data.message || "Booking cancelled.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to cancel booking");
    } finally {
      setCancelingId(null);
    }
  }

  if (loading) {
    return <p className="text-cream/60">Loading your tickets...</p>;
  }

  return (
    <div className="mx-auto max-w-5xl text-white">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gold">My tickets</p>
          <h1 className="mt-2 font-display text-4xl text-cream">Booking history</h1>
        </div>
        <Link href="/" className="text-sm text-cream/60 hover:text-cream">
          ← Discover more shows
        </Link>
      </div>

      {message && (
        <div className="mb-5 rounded-xl border border-gold/20 bg-gold/5 px-4 py-3 text-sm text-gold">
          {message}
        </div>
      )}

      {bookings.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-cream/60">
          No bookings yet. Pick a show and reserve your seats.
        </div>
      ) : (
        <div className="space-y-5">
          {bookings.map((booking) => (
            <div key={booking.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-gold">{booking.reference}</p>
                  <h2 className="mt-2 font-display text-2xl text-cream">{booking.show.title}</h2>
                  <p className="mt-1 text-sm text-cream/60">
                    {new Date(booking.show.startsAt).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-2 text-sm text-cream/80">
                  {booking.status}
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <div className="text-sm text-cream/60">
                  <p>{booking.show.venue.name}</p>
                  <p>{booking.show.venue.city}</p>
                </div>

                <div className="text-sm text-cream/60">
                  <p>Seats:</p>
                  <p className="text-cream">
                    {booking.seats
                      .map((seat) => `${seat.showSeat.seat.row}${seat.showSeat.seat.number}`)
                      .join(", ")}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3 text-sm text-cream/70 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Total: {formatCurrency(
                    booking.seats.reduce((sum, seat) => sum + seat.showSeat.priceCents, 0)
                  )}
                </span>

                {booking.status === "CONFIRMED" && (
                  <button
                    type="button"
                    onClick={() => handleCancel(booking)}
                    disabled={cancelingId === booking.id}
                    className="rounded-full border border-rose-400/40 bg-rose-500/10 px-4 py-2 font-medium text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {cancelingId === booking.id ? "Cancelling..." : "Cancel booking"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
