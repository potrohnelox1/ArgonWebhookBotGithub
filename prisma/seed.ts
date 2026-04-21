import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma";
const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const FEATURES = [
  { name: "deployments",       enabled: true,  additionalConfigs: null },
  { name: "forks",             enabled: true,  additionalConfigs: null },
  { name: "packages",          enabled: true,  additionalConfigs: null },
  { name: "page_build",        enabled: true,  additionalConfigs: null },
  { name: "pull_request",      enabled: true,  additionalConfigs: null },
  { name: "push",              enabled: true,  additionalConfigs: null },
  { name: "registry_packages", enabled: true,  additionalConfigs: null },
  { name: "release",           enabled: true,  additionalConfigs: null },
  { name: "repository",        enabled: true,  additionalConfigs: null },
  {
    name: "star",
    enabled: true,
    additionalConfigs: {
      // Notify every N stars gained/lost
      step: 10,
    },
  },
] as const;

async function main() {
  for (const feature of FEATURES) {
    await prisma.feature.upsert({
      where: { name: feature.name },
      update: {},
      //@ts-ignore
      create: feature,
    });
  }
  console.log("✅ Features seeded");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());