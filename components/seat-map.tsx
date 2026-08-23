"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { formatCurrency } from "@/lib/utils";

type Seat = {
  id: string;
  status: "AVAILABLE" | "HELD" | "BOOKED";
  category: string;
  priceCents: number;
  mine?: boolean;
  seat: { row: string; number: number };
};

type SeatMapProps = {
  showId: string;
  loggedIn: boolean;
};

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`block h-3 w-3 rounded-sm ${className}`} />
      <span>{label}</span>
    </div>
  );
}

export function SeatMap({ showId, loggedIn }: SeatMapProps) {
  const router = useRouter();
  const [seats, setSeats] = useState<Seat[]>([]);
  const [mine, setMine] = useState<string[]>([]);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [waitlistCounts, setWaitlistCounts] = useState({ STANDARD: 0, PREMIUM: 0 });
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [waitlistMsg, setWaitlistMsg] = useState("");

  const load = useCallback(async () => {
    try {
      const [seatsRes, queueRes] = await Promise.all([
        fetch(`/api/shows/${showId}/seats`, { cache: "no-store" }),
        fetch(`/api/waitlist?showId=${showId}`, { cache: "no-store" }),
      ]);

      if (!seatsRes.ok) {
        const text = await seatsRes.text();
        let message = "Could not load seats";

        try {
          const data = text ? JSON.parse(text) : null;
          message = data?.error ?? message;
        } catch {
          // fallback to the default message when the API returns a non-JSON error body
        }

        setError(message);
        setSeats([]);
        setMine([]);
        setExpiresAt(null);
        return;
      }

      const seatText = await seatsRes.text();
      if (seatText) {
        const data = JSON.parse(seatText);
        setSeats(data.seats ?? []);
        setMine(data.mine ?? []);
        setExpiresAt(data.expiresAt ?? null);
      } else {
        setSeats([]);
        setMine([]);
        setExpiresAt(null);
      }

      if (queueRes.ok) {
        const queueText = await queueRes.text();
        if (queueText) {
          const queueData = JSON.parse(queueText);
          setWaitlistCounts(queueData.counts ?? { STANDARD: 0, PREMIUM: 0 });
        }
      }

      setError("");
    } catch {
      setError("Could not load seats");
      setSeats([]);
      setMine([]);
      setExpiresAt(null);
    }
  }, [showId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 2500);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const rows = useMemo(() => {
    const map = new Map<string, Seat[]>();

    for (const s of seats) {
      const list = map.get(s.seat.row) ?? [];
      list.push(s);
      map.set(s.seat.row, list);
    }

    for (const list of Array.from(map.values()) as Seat[][]) {
      list.sort((a, b) => a.seat.number - b.seat.number);
    }

    return Array.from(map.entries()) as [string, Seat[]][];
  }, [seats]);

  const selected = seats.filter((s) => mine.includes(s.id));
  const total = selected.reduce((a, s) => a + s.priceCents, 0);
  const remaining = expiresAt
    ? Math.max(0, Math.floor((new Date(expiresAt).getTime() - now) / 1000))
    : 0;

  async function toggle(seat: Seat) {
    setError("");
    if (!loggedIn) {
      router.push(`/login?next=/shows/${showId}`);
      return;
    }

    setBusy(seat.id);
    try {
      if (mine.includes(seat.id)) {
        const res = await fetch("/api/holds", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ showSeatId: seat.id }),
        });

        if (!res.ok) {
          const text = await res.text();
          let message = "Could not release seat";
          try {
            message = JSON.parse(text)?.error ?? message;
          } catch {
            // ignore non-JSON payloads
          }
          throw new Error(message);
        }
      } else {
        if (seat.status !== "AVAILABLE") return;

        const res = await fetch("/api/holds", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ showSeatIds: [seat.id] }),
        });

        if (!res.ok) {
          const text = await res.text();
          let message = "Seat no longer available";
          try {
            message = JSON.parse(text)?.error ?? message;
          } catch {
            // ignore non-JSON payloads
          }
          throw new Error(message);
        }
      }

      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not hold seat");
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function joinWaitlist(category: string) {
    setWaitlistMsg("");
    const res = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ showId, category }),
    });

    const text = await res.text();
    let data: { error?: string; queuePosition?: number } | null = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      // ignore non-JSON payloads
    }

    if (data?.queuePosition) {
      setWaitlistMsg(`You are #${data.queuePosition} in the ${category.toLowerCase()} waitlist.`);
    } else {
      setWaitlistMsg(data?.error ?? "You're on the waitlist. We'll email you if a seat opens.");
    }
  }

  const soldPremium =
    seats.filter((s) => s.category === "PREMIUM" && s.status === "AVAILABLE").length === 0 &&
    seats.some((s) => s.category === "PREMIUM");

  const soldStandard =
    seats.filter((s) => s.category === "STANDARD" && s.status === "AVAILABLE").length === 0 &&
    seats.some((s) => s.category === "STANDARD");

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
      <div>
        <div className="mx-auto mb-8 max-w-xl">
          <div className="h-2 rounded-full bg-gradient-to-b from-cream/40 to-transparent opacity-80" />
          <p className="mt-2 text-center text-[11px] uppercase tracking-[0.3em] text-cream/40">
            Screen
          </p>
        </div>

        <div className="space-y-2 overflow-x-auto pb-4">
          {rows.map(([row, list]) => (
            <div key={row} className="flex items-center justify-center gap-1.5">
              <span className="w-6 text-center text-xs text-cream/40">{row}</span>
              {list.map((seat: Seat) => {
                const isMine = mine.includes(seat.id);
                const aisle = seat.seat.number === 4 || seat.seat.number === 9;

                return (
                  <button
                    key={seat.id}
                    disabled={busy !== null || (!isMine && seat.status !== "AVAILABLE")}
                    onClick={() => toggle(seat)}
                    title={`${row}${seat.seat.number} · ${seat.category} · ${formatCurrency(seat.priceCents)}`}
                    className={[
                      "h-7 w-7 rounded-t-md text-[10px] transition",
                      aisle ? "ml-4" : "",
                      isMine
                        ? "bg-gold text-ink shadow-[0_0_12px_rgba(232,184,109,0.55)]"
                        : seat.status === "AVAILABLE"
                          ? seat.category === "PREMIUM"
                            ? "bg-amber-400/80 hover:bg-amber-300"
                            : "bg-sky-400/70 hover:bg-sky-300"
                          : seat.status === "HELD"
                            ? "bg-orange-700/80 cursor-not-allowed"
                            : "bg-zinc-700 cursor-not-allowed",
                    ].join(" ")}
                  >
                    {busy === seat.id ? (
                      <Loader2 className="mx-auto h-3 w-3 animate-spin" />
                    ) : (
                      seat.seat.number
                    )}
                  </button>
                );
              })}
              <span className="w-6 text-center text-xs text-cream/40">{row}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-4 text-xs text-cream/55">
          <Legend className="bg-amber-400/80" label="Premium" />
          <Legend className="bg-sky-400/70" label="Standard" />
          <Legend className="bg-gold" label="Yours" />
          <Legend className="bg-orange-700/80" label="Held" />
          <Legend className="bg-zinc-700" label="Booked" />
        </div>

        {error && <p className="mt-4 text-center text-sm text-rose-300">{error}</p>}
      </div>

      <aside className="h-fit rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <h3 className="font-display text-xl text-cream">Your selection</h3>

        {selected.length === 0 ? (
          <p className="mt-3 text-sm text-cream/50">Tap a seat to hold it for 10 minutes.</p>
        ) : (
          <>
            {expiresAt && (
              <p className="mt-2 text-xs uppercase tracking-wider text-gold">
                Hold {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}
              </p>
            )}

            <ul className="mt-3 space-y-2 text-sm">
              {selected.map((s) => (
                <li key={s.id} className="flex justify-between text-cream/80">
                  <span>
                    {s.seat.row}
                    {s.seat.number} · {s.category.toLowerCase()}
                  </span>
                  <span>{formatCurrency(s.priceCents)}</span>
                </li>
              ))}
            </ul>

            <p className="mt-4 flex justify-between font-medium text-cream">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </p>

            <Button className="mt-5 w-full" onClick={() => router.push("/checkout")}>
              Continue to checkout
            </Button>
          </>
        )}

        {soldPremium && (
          <p className="mt-4 text-xs text-amber-300">Premium seats are sold out.</p>
        )}

        {soldStandard && (
          <p className="mt-2 text-xs text-sky-300">Standard seats are sold out.</p>
        )}

        <div className="mt-5 border-t border-white/10 pt-4">
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-cream/50">Waitlist</p>
          <div className="mb-3 space-y-1 text-[11px] text-cream/60">
            <p>Standard queue: {waitlistCounts.STANDARD}</p>
            <p>Premium queue: {waitlistCounts.PREMIUM}</p>
          </div>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => joinWaitlist("STANDARD")}
          >
            Join Standard waitlist
          </Button>
          <Button
            variant="secondary"
            className="mt-2 w-full"
            onClick={() => joinWaitlist("PREMIUM")}
          >
            Join Premium waitlist
          </Button>
          {waitlistMsg && <p className="mt-3 text-xs text-cream/70">{waitlistMsg}</p>}
        </div>
      </aside>
    </div>
  );
}

export default SeatMap;