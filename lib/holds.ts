import { prisma } from "./prisma";
import { clearHoldMirror, mirrorHold } from "./redis";
import { HOLD_MINUTES } from "./utils";
import { offerSeatToWaitlist } from "./waitlist";

const isPostgres = () => (process.env.DATABASE_URL ?? "").startsWith("postgres");

export async function expireStale() {
  const now = new Date();
  const expiredHolds = await prisma.hold.findMany({
    where: { expiresAt: { lt: now } },
  });

  for (const hold of expiredHolds) {
    await prisma.$transaction(async (tx) => {
      const seat = await tx.showSeat.findUnique({ where: { id: hold.showSeatId } });
      if (seat?.status === "HELD") {
        await tx.showSeat.update({
          where: { id: seat.id },
          data: { status: "AVAILABLE" },
        });
        await offerSeatToWaitlist(seat.showId, seat.category, seat.id);
      }
      await tx.hold.deleteMany({ where: { id: hold.id } });
    });
    await clearHoldMirror(hold.showSeatId);
  }

  const expiredOffers = await prisma.waitlistEntry.findMany({
    where: { status: "OFFERED", offerExpiresAt: { lt: now } },
  });

  for (const entry of expiredOffers) {
    await prisma.waitlistEntry.update({
      where: { id: entry.id },
      data: { status: "EXPIRED", offerToken: null },
    });
    if (entry.offeredSeatId) {
      const seat = await prisma.showSeat.findUnique({
        where: { id: entry.offeredSeatId },
      });
      if (seat?.status === "HELD") {
        await prisma.showSeat.update({
          where: { id: seat.id },
          data: { status: "AVAILABLE" },
        });
      }
      await prisma.hold.deleteMany({ where: { showSeatId: entry.offeredSeatId } });
      await clearHoldMirror(entry.offeredSeatId);
      await offerSeatToWaitlist(entry.showId, entry.category, entry.offeredSeatId);
    }
  }
}

export async function holdSeats(userId: string, showSeatIds: string[]) {
  await expireStale();
  const ttl = HOLD_MINUTES * 60;
  const expiresAt = new Date(Date.now() + HOLD_MINUTES * 60 * 1000);
  const uniqueSeatIds = [...new Set(showSeatIds.map(String))];

  try {
    const holds = await prisma.$transaction(async (tx) => {
      if (isPostgres() && uniqueSeatIds.length) {
        const ids = uniqueSeatIds.map((id) => `'${id.replace(/'/g, "")}'`).join(",");
        await tx.$queryRawUnsafe(
          `SELECT id FROM "ShowSeat" WHERE id IN (${ids}) FOR UPDATE`
        );
      }

      const seats = await tx.showSeat.findMany({
        where: { id: { in: uniqueSeatIds } },
      });
      if (seats.length !== uniqueSeatIds.length) {
        throw new Error("SEAT_NOT_FOUND");
      }
      if (seats.some((s) => s.status !== "AVAILABLE")) {
        throw new Error("SEAT_UNAVAILABLE");
      }

      const created = [];
      for (const seat of seats) {
        const updated = await tx.showSeat.updateMany({
          where: { id: seat.id, status: "AVAILABLE" },
          data: { status: "HELD" },
        });
        if (updated.count !== 1) {
          throw new Error("SEAT_UNAVAILABLE");
        }

        created.push(
          await tx.hold.create({
            data: { userId, showSeatId: seat.id, expiresAt },
          })
        );
      }
      return created;
    });

    await Promise.all(holds.map((h) => mirrorHold(h.showSeatId, ttl)));
    return holds;
  } catch (e: unknown) {
    const code =
      typeof e === "object" && e && "code" in e ? (e as { code: string }).code : "";
    const msg = e instanceof Error ? e.message : "";
    if (code === "P2002" || msg === "SEAT_UNAVAILABLE") {
      throw new Error("SEAT_UNAVAILABLE");
    }
    throw e;
  }
}

export async function releaseHold(userId: string, showSeatId: string) {
  const hold = await prisma.hold.findUnique({ where: { showSeatId } });
  if (!hold || hold.userId !== userId) throw new Error("HOLD_NOT_FOUND");

  await prisma.$transaction(async (tx) => {
    await tx.hold.deleteMany({ where: { showSeatId } });
    const seat = await tx.showSeat.findUnique({ where: { id: showSeatId } });
    if (seat?.status === "HELD") {
      await tx.showSeat.update({
        where: { id: showSeatId },
        data: { status: "AVAILABLE" },
      });
    }
  });
  await clearHoldMirror(showSeatId);
}
