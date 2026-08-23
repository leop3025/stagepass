import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cancelBooking, confirmUserHolds } from "@/lib/booking";

export async function GET() {
  const { user, error, status } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status });
  const bookings = await prisma.booking.findMany({
    where: { userId: user.id },
    include: {
      show: { include: { venue: true } },
      seats: { include: { showSeat: { include: { seat: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ bookings });
}

export async function POST() {
  const { user, error, status } = await requireUser(["CUSTOMER"]);
  if (!user) return NextResponse.json({ error }, { status });
  try {
    const booking = await confirmUserHolds(user.id);
    return NextResponse.json({ booking });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Checkout failed";
    return NextResponse.json({ error: msg === "NO_HOLDS" ? "Your hold expired. Pick seats again." : msg }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const { user, error, status } = await requireUser(["CUSTOMER"]);
  if (!user) return NextResponse.json({ error }, { status });

  try {
    const { bookingId } = await request.json().catch(() => ({ bookingId: null }));
    if (!bookingId) {
      return NextResponse.json({ error: "Booking id is required." }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        seats: { include: { showSeat: true } },
        show: true,
      },
    });

    if (!booking || booking.userId !== user.id) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    if (booking.status === "CANCELLED") {
      return NextResponse.json({ error: "This booking is already cancelled." }, { status: 400 });
    }

    const subtotalCents = booking.seats.reduce((sum, seat) => sum + seat.showSeat.priceCents, 0);
    const convenienceFeeCents = Math.max(500, Math.round(subtotalCents * 0.05));

    await cancelBooking(user.id, booking.id);

    return NextResponse.json({
      ok: true,
      bookingId: booking.id,
      subtotalCents,
      convenienceFeeCents,
      message: "Booking cancelled. A convenience fee was applied.",
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unable to cancel booking";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
