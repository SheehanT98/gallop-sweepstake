import "dotenv/config";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const dbPath = path.join(process.cwd(), "prisma", "dev.db");
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  const eventDate = new Date();
  eventDate.setDate(eventDate.getDate() + 7);
  const entryDeadline = new Date();
  entryDeadline.setDate(entryDeadline.getDate() + 3);

  const sweepstake = await prisma.sweepstake.create({
    data: {
      name: "Cheltenham Gold Cup 2026",
      description:
        "The showpiece race of the Festival - 3m 2f of jumping excellence",
      eventDate,
      entryDeadline,
      maxParticipants: 24,
      status: "draft",
      pointsFirst: 10,
      pointsSecond: 5,
      pointsThird: 2,
    },
  });

  const horses = [
    "Galopin Des Champs",
    "Fastorslow",
    "Gerri Colombe",
    "Bravemansgame",
    "L'Homme Presse",
    "Shishkin",
    "Ahoy Senor",
    "Corach Rambler",
    "Nassalam",
    "The Real Whacker",
    "Monkfish",
    "Protektorat",
  ];

  await prisma.horse.createMany({
    data: horses.map((name) => ({
      sweepstakeId: sweepstake.id,
      name,
    })),
  });

  console.log("Seeded:", sweepstake.name, "with", horses.length, "horses");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
