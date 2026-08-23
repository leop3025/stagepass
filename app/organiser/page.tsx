import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OrganiserDashboard } from "@/components/organiser-dashboard";

export default async function OrganiserPage() {
  const user = await getSession();

  if (!user) {
    redirect("/organiser/login?next=/organiser");
  }

  if (user.role !== "ORGANISER") {
    redirect("/");
  }

  const venues = await prisma.venue.findMany({
    where: { createdById: user.id },
    orderBy: { name: "asc" },
  });

  const shows = await prisma.show.findMany({
    where: { organiserId: user.id },
    include: {
      venue: true,
      bookings: {
        where: { status: "CONFIRMED" },
        include: {
          seats: { include: { showSeat: true } },
        },
      },
    },
    orderBy: { startsAt: "asc" },
  });

  const summary = shows.map((show) => {
    const confirmedBookings = show.bookings.length;
    const ticketsSold = show.bookings.reduce(
      (sum, booking) => sum + booking.seats.length,
      0
    );
    const revenueCents = show.bookings.reduce(
      (sum, booking) =>
        sum +
        booking.seats.reduce(
          (seatSum, bookingSeat) => seatSum + bookingSeat.showSeat.priceCents,
          0
        ),
      0
    );

    return {
      id: show.id,
      title: show.title,
      kind: show.kind,
      genre: show.genre,
      startsAt: show.startsAt.toISOString(),
      venue: show.venue.name,
      confirmedBookings,
      ticketsSold,
      revenueCents,
      standardPrice: show.standardPrice,
      premiumPrice: show.premiumPrice,
    };
  });

  return (
    <OrganiserDashboard
      initialVenues={venues}
      initialShows={summary}
      organiserName={user.name}
    />
  );
}
