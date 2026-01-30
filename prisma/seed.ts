import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  await prisma.product.upsert({
    where: { code: "G.1000" },
    update: {},
    create: { code: "G.1000", name: "Cat Warna A", unit: "KG", price: 100000 },
  });

  await prisma.product.upsert({
    where: { code: "G.2000" },
    update: {},
    create: { code: "G.2000", name: "Cat Warna B", unit: "KG", price: 150000 },
  });

  console.log("Seed products done.");
}

main()
  .catch(console.error)
  .finally(async () => prisma.$disconnect());
