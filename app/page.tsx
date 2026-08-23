import { ShowCard } from "@/components/show-card";
import { prisma } from "@/lib/prisma";

type Show = {
  id: string;
  title: string;
  genre: string;
  kind: string;
  startsAt: string;
  premiumPrice: number;
  standardPrice: number;
  venue: {
    name: string;
    city: string;
  };
};

async function getShows(): Promise<Show[]> {
  const apiKey = process.env.TICKETMASTER_API_KEY;

  if (apiKey) {
    try {
      const url =
        `https://app.ticketmaster.com/discovery/v2/events.json` +
        `?apikey=${apiKey}` +
        `&size=12` +
        `&countryCode=US`;

      const res = await fetch(url, {
        next: { revalidate: 3600 },
      });

      if (res.ok) {
        const data = await res.json();

        return (data._embedded?.events ?? []).map(
          (event: {
            id: string;
            name: string;
            classifications?: {
              genre?: { name?: string };
              segment?: { name?: string };
            }[];
            dates?: {
              start?: {
                dateTime?: string;
                localDate?: string;
              };
            };
            _embedded?: {
              venues?: {
                name?: string;
                city?: { name?: string };
              }[];
            };
          }) => ({
            id: event.id,
            title: event.name,
            genre:
              event.classifications?.[0]?.genre?.name ??
              "Entertainment",
            kind:
              event.classifications?.[0]?.segment?.name ??
              "LIVE",
            startsAt:
              event.dates?.start?.dateTime ??
              event.dates?.start?.localDate ??
              new Date().toISOString(),

            standardPrice: 750,
            premiumPrice: 1500,

            venue: {
              name:
                event._embedded?.venues?.[0]?.name ??
                "Venue TBA",
              city:
                event._embedded?.venues?.[0]?.city?.name ??
                "City TBA",
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

export default async function Home() {
  const shows = await getShows();

  return (
    <main className="min-h-screen bg-[#17120e] text-white">
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="max-w-3xl">
          <p className="mb-4 text-sm font-semibold tracking-[0.2em] text-gold">
            LIVE EVENTS • SPORTS • ENTERTAINMENT
          </p>

          <h1 className="font-display text-5xl font-bold tracking-tight sm:text-7xl">
            Find your next
            <span className="block text-gold">
              great experience.
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-cream/60">
            Discover real upcoming events and reserve your seats with StagePass.
          </p>

          <div className="mt-10">
            <a
              href="/shows"
              className="rounded-full bg-gold px-6 py-3 font-semibold text-black"
            >
              Explore Events
            </a>
          </div>
        </div>
      </section>

      <section id="events" className="mx-auto max-w-7xl px-6 pb-20">
        <h2 className="font-display text-3xl text-cream">
          Upcoming Events
        </h2>

        <p className="mb-8 mt-2 text-cream/50">
          Live event data powered by Ticketmaster.
        </p>

        {shows.length === 0 ? (
          <p className="text-cream/60">
            No events could be loaded.
          </p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {shows.map((show) => (
              <ShowCard key={show.id} show={show} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}