import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { expireStale } from "@/lib/holds";

export const dynamic = "force-dynamic";

const FALLBACK_ROWS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

async function ensureShowSeatCatalog(showId: string) {
  const organiser = await prisma.user.upsert({
    where: { email: "system@stagepass.local" },
    update: {},
    create: {
      email: "system@stagepass.local",
      passwordHash: "SYSTEM_ACCOUNT",
      name: "StagePass",
      role: "ORGANISER",
    },
  });

  const venueId = `venue-${showId}`;
  let venue = await prisma.venue.findUnique({ where: { id: venueId } });

  if (!venue) {
    venue = await prisma.venue.create({
      data: {
        id: venueId,
        name: "Ticketmaster Venue",
        address: "External venue",
        city: "External",
        createdById: organiser.id,
      },
    });
  }

  const existingShow = await prisma.show.findUnique({ where: { id: showId } });
  if (!existingShow) {
    await prisma.show.create({
      data: {
        id: showId,
        title: "Ticketmaster Event",
        description: "Imported from Ticketmaster",
        kind: "LIVE",
        genre: "Entertainment",
        venueId: venue.id,
        organiserId: organiser.id,
        startsAt: new Date(),
        durationMin: 120,
        premiumPrice: 150000,
        standardPrice: 75000,
      },
    });
  }

  const existingSeats = await prisma.showSeat.count({ where: { showId } });
  if (existingSeats === 0) {
    for (const row of FALLBACK_ROWS) {
      for (let number = 1; number <= 12; number += 1) {
        const category = row <= "C" ? "PREMIUM" : "STANDARD";
        const seat = await prisma.seat.upsert({
          where: {
            venueId_row_number: {
              venueId: venue.id,
              row,
              number,
            },
          },
          update: {},
          create: {
            venueId: venue.id,
            row,
            number,
            category,
          },
        });

        await prisma.showSeat.upsert({
          where: {
            showId_seatId: {
              showId,
              seatId: seat.id,
            },
          },
          update: {},
          create: {
            showId,
            seatId: seat.id,
            category,
            priceCents: category === "PREMIUM" ? 150000 : 75000,
            status: "AVAILABLE",
          },
        });
      }
    }
  }
}

function buildFallbackSeats() {
  const seats: Array<{
    id: string;
    status: "AVAILABLE";
    category: "PREMIUM" | "STANDARD";
    priceCents: number;
    seat: { row: string; number: number };
  }> = [];

  for (const row of FALLBACK_ROWS) {
    for (let number = 1; number <= 12; number += 1) {
      const category = row <= "C" ? "PREMIUM" : "STANDARD";
      seats.push({
        id: `fallback-${row}-${number}`,
        status: "AVAILABLE",
        category,
        priceCents: category === "PREMIUM" ? 150000 : 75000,
        seat: { row, number },
      });
    }
  }

  return seats;
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    await expireStale();
    await ensureShowSeatCatalog(id);

    const show = await prisma.show.findUnique({
      where: { id },
      include: { venue: { include: { seats: true } } },
    });

    if (!show) {
      return NextResponse.json({
        seats: buildFallbackSeats(),
        mine: [],
        expiresAt: null,
      });
    }

    const existingSeats = await prisma.showSeat.count({ where: { showId: id } });
    if (existingSeats === 0 && show.venue.seats.length > 0) {
      await prisma.showSeat.createMany({
        data: show.venue.seats.map((seat) => ({
          showId: id,
          seatId: seat.id,
          category: seat.category,
          priceCents: seat.category === "PREMIUM" ? show.premiumPrice : show.standardPrice,
          status: "AVAILABLE",
        })),
      });
    }

    const user = await getSession();
    const seats = await prisma.showSeat.findMany({
      where: { showId: id },
      include: { seat: true, hold: true },
      orderBy: [{ seat: { row: "asc" } }, { seat: { number: "asc" } }],
    });

    if (seats.length === 0) {
      return NextResponse.json({
        seats: buildFallbackSeats(),
        mine: [],
        expiresAt: null,
      });
    }

    const mine = user
      ? seats.filter((s) => s.hold?.userId === user.id).map((s) => s.id)
      : [];
    const mineHolds = seats
      .filter((s) => s.hold?.userId === user?.id)
      .map((s) => s.hold!.expiresAt);
    const expiresAt =
      mineHolds.length > 0
        ? new Date(Math.min(...mineHolds.map((d) => d.getTime()))).toISOString()
        : null;

    return NextResponse.json({
      seats: seats.map((s) => ({
        id: s.id,
        status: s.status,
        category: s.category,
        priceCents: s.priceCents,
        seat: s.seat,
      })),
      mine,
      expiresAt,
    });
  } catch (error) {
    console.error("SEAT API ERROR:", error);
    return NextResponse.json({
      seats: buildFallbackSeats(),
      mine: [],
      expiresAt: null,
    });
  }
}
