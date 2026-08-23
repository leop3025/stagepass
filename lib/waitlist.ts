import { randomBytes } from "crypto";
import { prisma } from "./prisma";
import { mirrorHold } from "./redis";
import { WAITLIST_OFFER_MINUTES } from "./utils";
import { sendEmail, waitlistOfferHtml } from "./email";

export async function getWaitlistQueueCounts(showId: string) {
  const rows = await prisma.waitlistEntry.groupBy({
    by: ["category"],
    where: { showId, status: "WAITING" },
    _count: { _all: true },
  });

  const counts = { STANDARD: 0, PREMIUM: 0 } as Record<string, number>;
  for (const row of rows) {
    counts[row.category] = row._count._all;
  }
  return counts;
}

export async function joinWaitlist(
  userId: string,
  showId: string,
  category: string
) {
  const available = await prisma.showSeat.count({
    where: { showId, category, status: "AVAILABLE" },
  });
  if (available > 0) {
    throw new Error("SEATS_STILL_AVAILABLE");
  }

  const existing = await prisma.waitlistEntry.findFirst({
    where: {
      userId,
      showId,
      category,
      status: { in: ["WAITING", "OFFERED"] },
    },
  });
  if (existing) return existing;

  const created = await prisma.waitlistEntry.create({
    data: { userId, showId, category, status: "WAITING" },
  });

  const queueCount = await prisma.waitlistEntry.count({
    where: { showId, category, status: "WAITING" },
  });
  return { ...created, queuePosition: queueCount };
}

export async function offerSeatToWaitlist(
  showId: string,
  category: string,
  showSeatId: string
) {
  const next = await prisma.waitlistEntry.findFirst({
    where: { showId, category, status: "WAITING" },
    orderBy: { createdAt: "asc" },
    include: { user: true, show: { include: { venue: true } } },
  });

  if (!next) {
    await prisma.showSeat.update({
      where: { id: showSeatId },
      data: { status: "AVAILABLE" },
    });
    return null;
  }

  const token = randomBytes(24).toString("hex");
  const offerExpiresAt = new Date(
    Date.now() + WAITLIST_OFFER_MINUTES * 60 * 1000
  );

  await prisma.$transaction(async (tx) => {
    await tx.showSeat.update({
      where: { id: showSeatId },
      data: { status: "HELD" },
    });
    await tx.hold.deleteMany({ where: { showSeatId } });
    await tx.hold.create({
      data: {
        userId: next.userId,
        showSeatId,
        expiresAt: offerExpiresAt,
      },
    });
    await tx.waitlistEntry.update({
      where: { id: next.id },
      data: {
        status: "OFFERED",
        offerToken: token,
        offerExpiresAt,
        offeredSeatId: showSeatId,
      },
    });
  });

  await mirrorHold(showSeatId, WAITLIST_OFFER_MINUTES * 60);

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  await sendEmail({
    to: next.user.email,
    subject: `A ${category.toLowerCase()} seat opened for ${next.show.title}`,
    html: waitlistOfferHtml({
      name: next.user.name,
      title: next.show.title,
      category,
      link: `${appUrl}/offer/${token}`,
      minutes: WAITLIST_OFFER_MINUTES,
    }),
  });

  return next;
}

export async function getOffer(token: string) {
  return prisma.waitlistEntry.findUnique({
    where: { offerToken: token },
    include: {
      show: { include: { venue: true } },
      user: true,
    },
  });
}
