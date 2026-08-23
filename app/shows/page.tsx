import { ShowCard } from "@/components/show-card";
import { prisma } from "@/lib/prisma";

export type ShowListItem = {
  id: string;
  title: string;
  genre: string;
  kind: string;
  startsAt: string;
  premiumPrice: number;
  standardPrice: number;
  venue: { name: string; city: string };
};

async function getShows(): Promise<ShowListItem[]> {
  const apiKey = process.env.TICKETMASTER_API_KEY;

  if (apiKey) {
    try {
      const url =
        `https://app.ticketmaster.com/discovery/v2/events.json` +
        `?apikey=${apiKey}` +
        `&size=18` +
        `&countryCode=US`;

      const res = await fetch(url, { next: { revalidate: 3600 } });
      if (res.ok) {
        const data = await res.json();
        return (data._embedded?.events ?? []).map(
          (event: {
            id: string;
            name: string;
            classifications?: { genre?: { name?: string }; segment?: { name?: string } }[];
            dates?: { start?: { dateTime?: string; localDate?: string } };
            _embedded?: { venues?: { name?: string; city?: { name?: string } }[] };
          }) => ({
            id: event.id,
            title: event.name,
            genre: event.classifications?.[0]?.genre?.name ?? "Entertainment",
            kind: event.classifications?.[0]?.segment?.name ?? "LIVE",
            startsAt:
              event.dates?.start?.dateTime ??
              event.dates?.start?.localDate ??
              new Date().toISOString(),
            standardPrice: 750,
            premiumPrice: 1500,
            venue: {
              name: event._embedded?.venues?.[0]?.name ?? "Venue TBA",
              city: event._embedded?.venues?.[0]?.city?.name ?? "City TBA",
            },
          })
        );
      }
    } catch (error) {
      console.error("Could not load events:", error);
    }
  }

  const localShows = await prisma.show.findMany({
    include: { venue: true },
    orderBy: { startsAt: "asc" },
  });

  return localShows.map((show) => ({
    id: show.id,
    title: show.title,
    genre: show.genre,
    kind: show.kind,
    startsAt: show.startsAt.toISOString(),
    premiumPrice: show.premiumPrice,
    standardPrice: show.standardPrice,
    venue: {
      name: show.venue.name,
      city: show.venue.city,
    },
  }));
}

export default async function ShowsPage() {
  const shows = await getShows();

  return (
    <main className="min-h-screen bg-[#17120e] px-6 py-16 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10">
          <p className="text-sm font-semibold tracking-[0.3em] text-gold">DISCOVER</p>
          <h1 className="mt-3 font-display text-4xl text-cream sm:text-5xl">All events</h1>
          <p className="mt-3 max-w-2xl text-cream/60">
            Browse upcoming live experiences and pick the one you want to book.
          </p>
        </div>

        {shows.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-cream/60">
            No events are available right now.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {shows.map((show) => (
              <ShowCard key={show.id} show={show} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
