import { prisma } from "./prisma";
import { clearHoldMirror } from "./redis";
import { bookingQrDataUrl } from "./qr";
import { bookingEmailHtml, sendEmail } from "./email";
import { bookingReference } from "./utils";
import { offerSeatToWaitlist } from "./waitlist";
import { format } from "date-fns";

export async function confirmUserHolds(userId: string) {
  const holds = await prisma.hold.findMany({
    where: { userId, expiresAt: { gt: new Date() } },
    include: {
      showSeat: { include: { seat: true, show: { include: { venue: true } } } },
    },
  });
  if (!holds.length) throw new Error("NO_HOLDS");

  const showId = holds[0].showSeat.showId;
  if (holds.some((h) => h.showSeat.showId !== showId)) {
    throw new Error("MIXED_SHOWS");
  }

  const reference = bookingReference();
  const qrDataUrl = await bookingQrDataUrl(reference);

  const booking = await prisma.$transaction(async (tx) => {
    const created = await tx.booking.create({
      data: {
        reference,
        userId,
        showId,
        status: "CONFIRMED",
        qrDataUrl,
      },
    });

    for (const hold of holds) {
      const updated = await tx.showSeat.updateMany({
        where: { id: hold.showSeatId, status: "HELD" },
        data: { status: "BOOKED" },
      });
      if (updated.count !== 1) throw new Error("SEAT_UNAVAILABLE");

      await tx.bookingSeat.upsert({
        where: { showSeatId: hold.showSeatId },
        update: { bookingId: created.id },
        create: { bookingId: created.id, showSeatId: hold.showSeatId },
      });

      await tx.hold.delete({ where: { id: hold.id } });
    }

    return created;
  });

  await Promise.all(holds.map((h) => clearHoldMirror(h.showSeatId)));

  const show = holds[0].showSeat.show;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const seats = holds
    .map((h) => `${h.showSeat.seat.row}${h.showSeat.seat.number}`)
    .join(", ");

  await sendEmail({
    to: user?.email ?? "",
    subject: `Your tickets for ${show.title} — ${reference}`,
    html: bookingEmailHtml({
      name: user?.name ?? "there",
      title: show.title,
      when: format(show.startsAt, "EEE d MMM yyyy · h:mm a"),
      venue: `${show.venue.name}, ${show.venue.city}`,
      seats,
      reference,
      qrDataUrl,
    }),
  });

  return prisma.booking.findUniqueOrThrow({
    where: { id: booking.id },
    include: {
      show: { include: { venue: true } },
      seats: { include: { showSeat: { include: { seat: true } } } },
    },
  });
}

export async function cancelBooking(userId: string, bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      seats: { include: { showSeat: true } },
      show: true,
    },
  });
  if (!booking || booking.userId !== userId) throw new Error("NOT_FOUND");
  if (booking.status !== "CONFIRMED") throw new Error("NOT_CANCELLABLE");

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: bookingId },
      data: { status: "CANCELLED" },
    });

    for (const row of booking.seats) {
      await tx.showSeat.update({
        where: { id: row.showSeatId },
        data: { status: "AVAILABLE" },
      });
      await tx.bookingSeat.deleteMany({
        where: { bookingId: booking.id, showSeatId: row.showSeatId },
      });
    }
  });

  for (const row of booking.seats) {
    await offerSeatToWaitlist(
      booking.showId,
      row.showSeat.category,
      row.showSeatId
    );
  }

  return { ok: true };
}
