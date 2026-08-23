import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { holdSeats, releaseHold } from "@/lib/holds";
import { prisma } from "@/lib/prisma";
import { MAX_SEATS } from "@/lib/utils";

export async function GET() {
  const { user, error, status } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status });
  const holds = await prisma.hold.findMany({
    where: { userId: user.id, expiresAt: { gt: new Date() } },
    include: { showSeat: { include: { seat: true, show: { include: { venue: true } } } } },
  });
  return NextResponse.json({ holds });
}

export async function POST(req: Request) {
  const { user, error, status } = await requireUser(["CUSTOMER"]);
  if (!user) return NextResponse.json({ error }, { status });
  const { showSeatIds } = await req.json();
  const ids = Array.isArray(showSeatIds) ? showSeatIds.map(String) : [];
  if (!ids.length) return NextResponse.json({ error: "No seats selected." }, { status: 400 });

  const existing = await prisma.hold.count({
    where: { userId: user.id, expiresAt: { gt: new Date() } },
  });
  if (existing + ids.length > MAX_SEATS) {
    return NextResponse.json({ error: `You can hold at most ${MAX_SEATS} seats.` }, { status: 400 });
  }

  try {
    const holds = await holdSeats(user.id, ids);
    return NextResponse.json({ holds });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "SEAT_UNAVAILABLE";
    if (msg === "SEAT_UNAVAILABLE") {
      return NextResponse.json({ error: "Seat no longer available" }, { status: 409 });
    }
    if (msg === "SEAT_NOT_FOUND") {
      return NextResponse.json({ error: "Seat not found. Please refresh and try again." }, { status: 400 });
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  const { user, error, status } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status });
  const { showSeatId } = await req.json();
  try {
    await releaseHold(user.id, String(showSeatId));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not release" },
      { status: 400 }
    );
  }
}
