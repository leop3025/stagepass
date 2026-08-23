import { NextResponse } from "next/server";

type TicketmasterImage = {
  ratio?: string;
  url?: string;
};

type TicketmasterEvent = {
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
  images?: TicketmasterImage[];
};

export async function GET() {
  const apiKey = process.env.TICKETMASTER_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Ticketmaster API key is missing" },
      { status: 500 }
    );
  }

  try {
    const url =
      `https://app.ticketmaster.com/discovery/v2/events.json` +
      `?apikey=${apiKey}` +
      `&size=12` +
      `&countryCode=US`;

    const response = await fetch(url, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Could not fetch events from Ticketmaster" },
        { status: response.status }
      );
    }

    const data = (await response.json()) as {
      _embedded?: {
        events?: TicketmasterEvent[];
      };
    };

    const events = (data._embedded?.events ?? []).map((event) => ({
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
        event.dates?.start?.localDate,
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
          (image: TicketmasterImage) => image.ratio === "16_9"
        )?.url ??
        event.images?.[0]?.url ??
        null,
    }));

    return NextResponse.json({ events });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Something went wrong while fetching events" },
      { status: 500 }
    );
  }
}