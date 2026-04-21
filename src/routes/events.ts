import { Hono } from "hono";
import { prisma } from "../lib/prisma";

export const eventsRouter = new Hono();

eventsRouter.get("/", async (c) => {
  const query = c.req.query();

  const limit = Math.min(Math.max(Number(query.limit ?? 20), 1), 100);
  const offset = Math.max(Number(query.offset ?? 0), 0);

  const where: NonNullable<Parameters<typeof prisma.rawEvent.findMany>[0]>["where"] = {};

  if (query.type) {
    where.type = query.type;
  }

  if (query.from || query.to) {
    where.createdAt = {
      ...(query.from ? { gte: new Date(query.from) } : {}),
      ...(query.to   ? { lte: new Date(query.to)   } : {}),
    };
  }

  const [total, items] = await Promise.all([
    prisma.rawEvent.count({ where }),
    prisma.rawEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
    }),
  ]);

  return c.json({
    total,
    limit,
    offset,
    items,
  });
});

eventsRouter.get("/:id", async (c) => {
  const event = await prisma.rawEvent.findUnique({
    where: { id: c.req.param("id") },
  });

  if (!event) return c.json({ error: "Not found" }, 404);
  return c.json(event);
});