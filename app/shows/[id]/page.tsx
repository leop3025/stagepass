import { notFound } from "next/navigation";
import { SeatMap } from "@/components/seat-map";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

async function getShow(id: string) {
  const apiKey = process.env.TICKETMASTER_API_KEY;

  if (apiKey) {
    try {
      const url =
        `https://app.ticketmaster.com/discovery/v2/events/${id}.json` +
        `?apikey=${apiKey}`;

      const res = await fetch(url, {
        next: { revalidate: 3600 },
      });

      if (res.ok) {
        const event = await res.json();

        return {
          id: event.id,
          title: event.name,
          genre:
            event.classifications?.[0]?.genre?.name ??
            "Entertainment",
          kind:
            event.classifications?.[0]?.segment?.name ??
            "Live Event",
          startsAt:
            event.dates?.start?.dateTime ??
            event.dates?.start?.localDate ??
            "",
          venue: {
            name:
              event._embedded?.venues?.[0]?.name ??
              "Venue TBA",
            city:
              event._embedded?.venues?.[0]?.city?.name ??
              "City TBA",
          },
          image:
            event.images?.find(
              (image: { ratio?: string }) =>
                image.ratio === "16_9"
            )?.url ??
            event.images?.[0]?.url ??
            null,
          standardPrice: 750,
          premiumPrice: 1500,
        };
      }
    } catch (error) {
      console.error("Could not load event:", error);
    }
  }

  const localShow = await prisma.show.findUnique({
    where: { id },
    include: { venue: true },
  });

  if (!localShow) {
    return null;
  }

  return {
    id: localShow.id,
    title: localShow.title,
    genre: localShow.genre,
    kind: localShow.kind,
    startsAt: localShow.startsAt.toISOString(),
    venue: {
      name: localShow.venue.name,
      city: localShow.venue.city,
    },
    image: null,
    standardPrice: localShow.standardPrice,
    premiumPrice: localShow.premiumPrice,
  };
}

export default async function ShowPage({ params }: PageProps) {
  const { id } = await params;
  const user = await getSession();
  const show = await getShow(id);

  if (!show) {
    notFound();
  }

  const date = show.startsAt
    ? new Date(show.startsAt)
    : null;

  return (
    <main className="min-h-screen bg-[#17120e] px-6 py-16 text-white">
      <div className="mx-auto max-w-6xl">

        {/* Event Header */}
        <section>
          <p className="mb-4 text-sm font-semibold tracking-widest text-gold">
            {show.genre.toUpperCase()}
          </p>

          <h1 className="font-display text-4xl font-bold sm:text-5xl">
            {show.title}
          </h1>

          <p className="mt-3 text-lg text-cream/60">
            {show.kind}
          </p>

          {/* Event Information */}
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-sm text-cream/40">
                Date & Time
              </p>

              <p className="mt-2 text-cream">
                {date
                  ? date.toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "TBA"}

                <br />

                {date
                  ? date.toLocaleTimeString("en-IN", {
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : ""}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-sm text-cream/40">
                Venue
              </p>

              <p className="mt-2 text-cream">
                {show.venue.name}
                <br />
                {show.venue.city}
              </p>
            </div>

            <div className="rounded-xl border border-gold/20 bg-white/[0.03] p-5">
              <p className="text-sm text-cream/40">
                Ticket prices
              </p>

              <p className="mt-2 text-gold">
                Standard: {formatCurrency(show.standardPrice)}
              </p>

              <p className="text-gold">
                Premium: {formatCurrency(show.premiumPrice)}
              </p>
            </div>
          </div>
        </section>

        {/* Seat Selection */}
        <section
          id="seats"
          className="mt-16 border-t border-white/10 pt-12"
        >
          <p className="text-sm font-semibold tracking-widest text-gold">
            STEP 1
          </p>

          <h2 className="mt-2 font-display text-3xl text-cream">
            Choose your seats
          </h2>

          <p className="mt-2 mb-8 text-cream/50">
            Select your preferred seats to continue with booking.
          </p>

          <SeatMap
            showId={show.id}
            loggedIn={!!user}
          />
        </section>

      </div>
    </main>
  );
}