import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const kind = req.nextUrl.searchParams.get("kind");
  const shows = await prisma.show.findMany({
    where: {
      startsAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      ...(kind ? { kind } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q } },
              { genre: { contains: q } },
              { venue: { city: { contains: q } } },
            ],
          }
        : {}),
    },
    include: { venue: true },
    orderBy: { startsAt: "asc" },
  });
  return NextResponse.json({ shows });
}

export async function POST(req: Request) {
  const { user, error, status } = await requireUser(["ORGANISER"]);
  if (!user) return NextResponse.json({ error }, { status });

  const body = await req.json();
  const title = String(body.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "Title is required." }, { status: 400 });

  const venue = await prisma.venue.findUnique({
    where: { id: String(body.venueId) },
    include: { seats: true },
  });
  if (!venue) return NextResponse.json({ error: "Venue not found." }, { status: 404 });

  const show = await prisma.show.create({
    data: {
      title,
      description: String(body.description ?? "").trim(),
      kind: body.kind === "EVENT" ? "EVENT" : "MOVIE",
      genre: String(body.genre ?? "General").trim(),
      venueId: venue.id,
      organiserId: user.id,
      startsAt: new Date(body.startsAt),
      durationMin: Number(body.durationMin) || 120,
      premiumPrice: Number(body.premiumPrice) || 0,
      standardPrice: Number(body.standardPrice) || 0,
    },
  });

  await prisma.showSeat.createMany({
    data: venue.seats.map((seat) => ({
      showId: show.id,
      seatId: seat.id,
      category: seat.category,
      priceCents: seat.category === "PREMIUM" ? show.premiumPrice : show.standardPrice,
      status: "AVAILABLE",
    })),
  });

  return NextResponse.json({ show });
}
