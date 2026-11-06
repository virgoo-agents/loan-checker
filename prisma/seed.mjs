import { PrismaClient } from "@prisma/client";
import { offers } from "./offers.mjs";

const prisma = new PrismaClient();

await prisma.offer.deleteMany();
await prisma.offer.createMany({ data: offers });
await prisma.$disconnect();
