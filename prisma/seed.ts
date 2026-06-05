import { PrismaClient, StockCategory, Tier } from "@prisma/client";

const prisma = new PrismaClient();

const categories = [
  StockCategory.TABLAS,
  StockCategory.TELAS,
  StockCategory.DIARIOS_VACIOS,
  StockCategory.ARTEFACTOS
];
const tiers = [Tier.T5, Tier.T6, Tier.T7, Tier.T8];

async function main() {
  for (const category of categories) {
    for (const tier of tiers) {
      await prisma.stockItem.upsert({
        where: { category_tier: { category, tier } },
        update: {},
        create: { category, tier }
      });
    }
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
