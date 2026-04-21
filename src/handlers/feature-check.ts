import { prisma } from "../lib/prisma";
import type { Feature } from "../../src/generated/prisma";

/** Returns the Feature row if it exists and is enabled, otherwise null */
export async function getEnabledFeature(name: string): Promise<Feature | null> {
  const feature = await prisma.feature.findUnique({ where: { name } });
  if (!feature || !feature.enabled) return null;
  return feature;
}
