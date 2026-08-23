import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function layout(rows: string[], seatsPerRow: number, premiumRows: string[]) {
  const seats: { row: string; number: number; category: string }[] = [];
  for (const row of rows) {
    for (let n = 1; n <= seatsPerRow; n++) {
      seats.push({
        row,
        number: n,
        category: premiumRows.includes(row) ? "PREMIUM" : "STANDARD",
      });
    }
  }
  return seats;
}

async function main() {
  await prisma.waitlistEntry.deleteMany();
  await prisma.bookingSeat.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.hold.deleteMany();
  await prisma.showSeat.deleteMany();
  await prisma.show.deleteMany();
  await prisma.seat.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.user.deleteMany();

  const admin = await prisma.user.create({
    data: {
      email: "admin@stagepass.test",
      name: "Asha Menon",
      role: "ADMIN",
      passwordHash: await bcrypt.hash("Admin123!", 10),
    },
  });
  const organiser = await prisma.user.create({
    data: {
      email: "organiser@stagepass.test",
      name: "Rahul Iyer",
      role: "ORGANISER",
      passwordHash: await bcrypt.hash("Organiser123!", 10),
    },
  });
  await prisma.user.create({
    data: {
      email: "veena@stagepass.test",
      name: "Veena",
      role: "CUSTOMER",
      passwordHash: await bcrypt.hash("Customer123!", 10),
    },
  });

  const lumiereSeats = layout(
    ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"],
    12,
    ["A", "B", "C"]
  );
  const harborSeats = layout(["A", "B", "C", "D", "E", "F", "G", "H"], 10, ["A", "B"]);

  const lumiere = await prisma.venue.create({
    data: {
      name: "Grand Lumière",
      address: "14 Marine Drive",
      city: "Mumbai",
      createdById: admin.id,
      seats: { create: lumiereSeats },
    },
    include: { seats: true },
  });

  const harbor = await prisma.venue.create({
    data: {
      name: "Harbor Hall",
      address: "88 Fort Lane",
      city: "Mumbai",
      createdById: admin.id,
      seats: { create: harborSeats },
    },
    include: { seats: true },
  });

  const shows = [
    {
      title: "Neon Harbor",
      description:
        "A rain-soaked thriller about a cartographer who maps a city that should not exist. Shot on 65mm with a score you will feel in your ribs.",
      kind: "MOVIE",
      genre: "Sci-Fi",
      venue: lumiere,
      startsAt: new Date("2026-08-22T19:30:00+05:30"),
      durationMin: 138,
      premiumPrice: 850,
      standardPrice: 420,
    },
    {
      title: "The Last Overture",
      description:
        "An ageing conductor returns for one night only. Intimate, devastating, and beautifully paced — premium rows put you in the pit.",
      kind: "MOVIE",
      genre: "Drama",
      venue: lumiere,
      startsAt: new Date("2026-08-23T18:00:00+05:30"),
      durationMin: 126,
      premiumPrice: 790,
      standardPrice: 390,
    },
    {
      title: "Jazz After Rain",
      description:
        "A live evening with the Malabar Sextet. Brass, monsoon percussion, and a late encore if the hall asks for it.",
      kind: "EVENT",
      genre: "Concert",
      venue: harbor,
      startsAt: new Date("2026-08-28T20:00:00+05:30"),
      durationMin: 110,
      premiumPrice: 1200,
      standardPrice: 650,
    },
    {
      title: "Midnight Circuit",
      description:
        "Heist cinema at full throttle. Come for the chase, stay for the quiet scene in the server room.",
      kind: "MOVIE",
      genre: "Thriller",
      venue: harbor,
      startsAt: new Date("2026-09-05T21:15:00+05:30"),
      durationMin: 118,
      premiumPrice: 720,
      standardPrice: 360,
    },
  ];

  for (const s of shows) {
    const show = await prisma.show.create({
      data: {
        title: s.title,
        description: s.description,
        kind: s.kind,
        genre: s.genre,
        venueId: s.venue.id,
        organiserId: organiser.id,
        startsAt: s.startsAt,
        durationMin: s.durationMin,
        premiumPrice: s.premiumPrice,
        standardPrice: s.standardPrice,
      },
    });

    await prisma.showSeat.createMany({
      data: s.venue.seats.map((seat) => ({
        showId: show.id,
        seatId: seat.id,
        category: seat.category,
        priceCents: seat.category === "PREMIUM" ? s.premiumPrice : s.standardPrice,
        status: "AVAILABLE",
      })),
    });
  }

  console.log("Seeded StagePass.");
  console.log("  Admin      admin@stagepass.test / Admin123!");
  console.log("  Organiser  organiser@stagepass.test / Organiser123!");
  console.log("  Customer   veena@stagepass.test / Customer123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
