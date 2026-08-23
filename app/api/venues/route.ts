import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET() {
  const venues = await prisma.venue.findMany({
    include: { _count: { select: { seats: true, shows: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ venues });
}

export async function POST(req: Request) {
  const { user, error, status } = await requireUser(["ADMIN", "ORGANISER"]);
  if (!user) return NextResponse.json({ error }, { status });

  const body = await req.json();
  const name = String(body.name ?? "").trim();
  const address = String(body.address ?? "").trim();
  const city = String(body.city ?? "").trim();
  const rows = String(body.rows ?? "A,B,C,D,E,F,G,H")
    .split(",")
    .map((r: string) => r.trim().toUpperCase())
    .filter(Boolean);
  const seatsPerRow = Math.min(20, Math.max(4, Number(body.seatsPerRow) || 12));
  const premiumRows = String(body.premiumRows ?? "A,B")
    .split(",")
    .map((r: string) => r.trim().toUpperCase());

  if (!name || !address || !city || !rows.length) {
    return NextResponse.json({ error: "Fill in venue name, address, city, and rows." }, { status: 400 });
  }

  const venue = await prisma.venue.create({
    data: {
      name,
      address,
      city,
      createdById: user.id,
      seats: {
        create: rows.flatMap((row) =>
          Array.from({ length: seatsPerRow }, (_, i) => ({
            row,
            number: i + 1,
            category: premiumRows.includes(row) ? "PREMIUM" : "STANDARD",
          }))
        ),
      },
    },
  });

  return NextResponse.json({ venue });
}
