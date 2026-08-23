import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Create/find system organiser
    const organiser = await prisma.user.upsert({
      where: {
        email: "system@stagepass.local",
      },
      update: {},
      create: {
        email: "system@stagepass.local",
        passwordHash: "SYSTEM_ACCOUNT",
        name: "StagePass",
        role: "ORGANISER",
      },
    });

    // 2. Create/find venue for this Ticketmaster event
    const venueId = `venue-${id}`;

    let venue = await prisma.venue.findUnique({
      where: {
        id: venueId,
      },
    });

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

    // 3. Create local Show if it does not exist
    const existingShow = await prisma.show.findUnique({
      where: {
        id: id,
      },
    });

    if (!existingShow) {
      await prisma.show.create({
        data: {
          id: id,
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

    // 4. Check if seats already exist
    const existingSeats = await prisma.showSeat.count({
      where: {
        showId: id,
      },
    });

    // 5. Generate seats only once
    if (existingSeats === 0) {
      const rows = ["A", "B", "C", "D", "E", "F"];

      for (const row of rows) {
        for (let number = 1; number <= 12; number++) {
          const isPremium = row === "A" || row === "B";

          // Find seat first in case it already exists
          let seat = await prisma.seat.findUnique({
            where: {
              venueId_row_number: {
                venueId: venue.id,
                row: row,
                number: number,
              },
            },
          });

          // Create physical seat if missing
          if (!seat) {
            seat = await prisma.seat.create({
              data: {
                venueId: venue.id,
                row: row,
                number: number,
                category: isPremium
                  ? "PREMIUM"
                  : "STANDARD",
              },
            });
          }

          // Create ShowSeat
          await prisma.showSeat.upsert({
            where: {
              showId_seatId: {
                showId: id,
                seatId: seat.id,
              },
            },

            update: {},

            create: {
              showId: id,
              seatId: seat.id,

              category: isPremium
                ? "PREMIUM"
                : "STANDARD",

              priceCents: isPremium
                ? 150000
                : 75000,

              status: "AVAILABLE",
            },
          });
        }
      }
    }

    // 6. Find expired holds
    const expiredHolds = await prisma.hold.findMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },

        showSeat: {
          showId: id,
        },
      },
    });

    // 7. Release expired seats
    if (expiredHolds.length > 0) {
      const holdIds = expiredHolds.map((hold) => hold.id);

      const showSeatIds = expiredHolds.map(
        (hold) => hold.showSeatId
      );

      await prisma.hold.deleteMany({
        where: {
          id: {
            in: holdIds,
          },
        },
      });

      await prisma.showSeat.updateMany({
        where: {
          id: {
            in: showSeatIds,
          },
        },

        data: {
          status: "AVAILABLE",
        },
      });
    }

    // 8. Get current seats
    const showSeats = await prisma.showSeat.findMany({
      where: {
        showId: id,
      },

      include: {
        seat: true,
      },
    });

    // 9. Sort seats manually
    // Avoids Prisma nested orderBy problems
    showSeats.sort((a, b) => {
      if (a.seat.row !== b.seat.row) {
        return a.seat.row.localeCompare(b.seat.row);
      }

      return a.seat.number - b.seat.number;
    });

    // 10. Send data to SeatMap
    const seats = showSeats.map((showSeat) => ({
      id: showSeat.id,
      status: showSeat.status,
      category: showSeat.category,
      priceCents: showSeat.priceCents,

      seat: {
        row: showSeat.seat.row,
        number: showSeat.seat.number,
      },
    }));

    return NextResponse.json({
      seats: seats,
      mine: [],
      expiresAt: null,
    });
  } catch (error) {
    console.error("SEAT API ERROR:", error);

    return NextResponse.json(
      {
        error: "Could not load seats",
      },
      {
        status: 500,
      }
    );
  }
}