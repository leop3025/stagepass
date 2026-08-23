import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getWaitlistQueueCounts, joinWaitlist } from "@/lib/waitlist";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const showId = searchParams.get("showId");

  if (!showId) {
    return NextResponse.json({ error: "Missing showId" }, { status: 400 });
  }

  const counts = await getWaitlistQueueCounts(showId);
  return NextResponse.json({ counts });
}

export async function POST(req: Request) {
  const { user, error, status } = await requireUser(["CUSTOMER"]);
  if (!user) return NextResponse.json({ error }, { status });

  try {
    const { showId, category } = await req.json();
    if (!showId || !category) {
      return NextResponse.json({ error: "Missing showId or category" }, { status: 400 });
    }

    const result = await joinWaitlist(user.id, String(showId), String(category).toUpperCase());
    const queuePosition = typeof result === "object" && result && "queuePosition" in result ? Number(result.queuePosition) : 0;

    if (queuePosition > 0) {
      return NextResponse.json({ ok: true, queuePosition });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not join waitlist";
    if (message === "SEATS_STILL_AVAILABLE") {
      return NextResponse.json({ error: "Seats are still available." }, { status: 400 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
