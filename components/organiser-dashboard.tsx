"use client";

import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/utils";

type Venue = {
  id: string;
  name: string;
  city: string;
  address: string;
};

type ShowSummary = {
  id: string;
  title: string;
  kind: string;
  genre: string;
  startsAt: string;
  venue: string;
  confirmedBookings: number;
  ticketsSold: number;
  revenueCents: number;
  standardPrice: number;
  premiumPrice: number;
};

export function OrganiserDashboard({
  initialVenues,
  initialShows,
  organiserName,
}: {
  initialVenues: Venue[];
  initialShows: ShowSummary[];
  organiserName: string;
}) {
  const [venues, setVenues] = useState(initialVenues);
  const [shows, setShows] = useState(initialShows);
  const [form, setForm] = useState({
    name: "",
    address: "",
    city: "",
    rows: "A,B,C,D,E,F",
    seatsPerRow: "12",
    premiumRows: "A,B",
  });
  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    venueId: initialVenues[0]?.id ?? "",
    type: "EVENT",
    genre: "Live",
    startsAt: "",
    durationMin: "120",
    standardPrice: "75",
    premiumPrice: "150",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [eventLoading, setEventLoading] = useState(false);

  const totalRevenue = useMemo(
    () => shows.reduce((sum, show) => sum + show.revenueCents, 0),
    [shows]
  );

  async function handleVenueCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/venues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create venue");

      setVenues((current) => [...current, data.venue]);
      setEventForm((current) => ({
        ...current,
        venueId: data.venue.id,
      }));
      setForm({
        name: "",
        address: "",
        city: "",
        rows: "A,B,C,D,E,F",
        seatsPerRow: "12",
        premiumRows: "A,B",
      });
      setSuccess("Venue created successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create venue");
    } finally {
      setLoading(false);
    }
  }

  async function handleEventCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setEventLoading(true);

    try {
      const res = await fetch("/api/shows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...eventForm,
          premiumPrice: Number(eventForm.premiumPrice) * 100,
          standardPrice: Number(eventForm.standardPrice) * 100,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create event");

      const nextShow = {
        id: data.show.id,
        title: data.show.title,
        kind: data.show.kind,
        genre: data.show.genre,
        startsAt: data.show.startsAt,
        venue: venues.find((v) => v.id === eventForm.venueId)?.name ?? "Venue",
        confirmedBookings: 0,
        ticketsSold: 0,
        revenueCents: 0,
        standardPrice: Number(eventForm.standardPrice) * 100,
        premiumPrice: Number(eventForm.premiumPrice) * 100,
      };

      setShows((current) => [nextShow, ...current]);
      setEventForm({
        title: "",
        description: "",
        venueId: venues[0]?.id ?? "",
        type: "EVENT",
        genre: "Live",
        startsAt: "",
        durationMin: "120",
        standardPrice: "75",
        premiumPrice: "150",
      });
      setSuccess("Event listing created successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create event");
    } finally {
      setEventLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 text-white">
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gold">Organiser</p>
        <h1 className="mt-3 font-display text-4xl text-cream">Welcome back, {organiserName}</h1>
        <p className="mt-3 text-cream/60">Create venues, publish movie and event listings, and monitor your revenue.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm text-cream/60">Venues</p>
          <p className="mt-3 text-3xl font-semibold text-gold">{venues.length}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm text-cream/60">Events</p>
          <p className="mt-3 text-3xl font-semibold text-gold">{shows.length}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm text-cream/60">Revenue</p>
          <p className="mt-3 text-3xl font-semibold text-gold">{formatCurrency(totalRevenue)}</p>
        </div>
      </div>

      {(error || success) && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${error ? "border-rose-400/30 bg-rose-500/10 text-rose-200" : "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"}`}>
          {error || success}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={handleVenueCreate} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="font-display text-2xl text-cream">Create venue</h2>
          <div className="mt-5 space-y-4">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Venue name" className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white" />
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Address" className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white" />
            <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="City" className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white" />
            <div className="grid gap-4 sm:grid-cols-2">
              <input value={form.rows} onChange={(e) => setForm({ ...form, rows: e.target.value })} placeholder="Rows: A,B,C" className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white" />
              <input value={form.seatsPerRow} onChange={(e) => setForm({ ...form, seatsPerRow: e.target.value })} placeholder="Seats per row" className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white" />
            </div>
            <input value={form.premiumRows} onChange={(e) => setForm({ ...form, premiumRows: e.target.value })} placeholder="Premium rows: A,B" className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white" />
            <button type="submit" disabled={loading} className="w-full rounded-xl bg-gold px-4 py-3 font-semibold text-black disabled:opacity-60">
              {loading ? "Creating venue..." : "Create venue"}
            </button>
          </div>
        </form>

        <form onSubmit={handleEventCreate} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="font-display text-2xl text-cream">Publish listing</h2>
          <div className="mt-5 space-y-4">
            <input value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} placeholder="Event or movie title" className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white" />
            <textarea value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} placeholder="Short description" className="min-h-[90px] w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white" />
            <div className="grid gap-4 sm:grid-cols-2">
              <select value={eventForm.venueId} onChange={(e) => setEventForm({ ...eventForm, venueId: e.target.value })} className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white">
                {venues.map((venue) => (
                  <option key={venue.id} value={venue.id}>{venue.name}</option>
                ))}
              </select>
              <select value={eventForm.type} onChange={(e) => setEventForm({ ...eventForm, type: e.target.value })} className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white">
                <option value="EVENT">Event</option>
                <option value="MOVIE">Movie</option>
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <input value={eventForm.genre} onChange={(e) => setEventForm({ ...eventForm, genre: e.target.value })} placeholder="Genre" className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white" />
              <input type="datetime-local" value={eventForm.startsAt} onChange={(e) => setEventForm({ ...eventForm, startsAt: e.target.value })} className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <input type="number" min="1" value={eventForm.durationMin} onChange={(e) => setEventForm({ ...eventForm, durationMin: e.target.value })} placeholder="Duration (min)" className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white" />
              <input type="number" min="0" step="0.01" value={eventForm.standardPrice} onChange={(e) => setEventForm({ ...eventForm, standardPrice: e.target.value })} placeholder="Standard price" className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white" />
            </div>
            <input type="number" min="0" step="0.01" value={eventForm.premiumPrice} onChange={(e) => setEventForm({ ...eventForm, premiumPrice: e.target.value })} placeholder="Premium price" className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white" />
            <button type="submit" disabled={eventLoading} className="w-full rounded-xl bg-gold px-4 py-3 font-semibold text-black disabled:opacity-60">
              {eventLoading ? "Publishing..." : "Create listing"}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="font-display text-2xl text-cream">Booking summary</h2>
        <div className="mt-5 space-y-4">
          {shows.length === 0 ? (
            <p className="text-cream/60">No listings published yet.</p>
          ) : (
            shows.map((show) => (
              <div key={show.id} className="rounded-xl border border-white/10 bg-black/10 p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-cream">{show.title}</p>
                    <p className="text-sm text-cream/60">
                      {show.venue} · {new Date(show.startsAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  </div>
                  <div className="text-sm text-gold">{show.kind} · {show.genre}</div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm text-cream/70">
                  <div><span className="block text-cream/40">Bookings</span>{show.confirmedBookings}</div>
                  <div><span className="block text-cream/40">Tickets sold</span>{show.ticketsSold}</div>
                  <div><span className="block text-cream/40">Revenue</span>{formatCurrency(show.revenueCents)}</div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-sm text-cream/70">
                  <span>Standard: {formatCurrency(show.standardPrice)}</span>
                  <span>Premium: {formatCurrency(show.premiumPrice)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
