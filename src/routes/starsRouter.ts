import { Hono } from "hono";
import { prisma } from "../lib/prisma";

export const starsRouter = new Hono();

/**
 * GET /stars
 *
 * Возвращает статистику по репозиториям (список репозиториев с количеством звезд).
 * Поддерживает пагинацию и поиск.
 *
 * Query params:
 *   limit   – количество записей (по умолчанию 20, максимум 100)
 *   offset  – пропустить N записей (по умолчанию 0)
 *   search  – фильтр по названию репозитория (repoName contains string)
 */
starsRouter.get("/", async (c) => {
  const query = c.req.query();

  const limit = Math.min(Math.max(Number(query.limit ?? 20), 1), 100);
  const offset = Math.max(Number(query.offset ?? 0), 0);

  // Формируем условия фильтрации
  const where: {
    repoName?: { contains: string; mode?: "insensitive" };
  } = {};

  if (query.search) {
    where.repoName = { 
      contains: query.search,
      // mode: "insensitive" // Раскомментируйте, если БД поддерживает (PostgreSQL)
    };
  }

  // Получаем данные и общее количество параллельно
  const [total, items] = await Promise.all([
    prisma.repoStar.count({ where }),
    prisma.repoStar.findMany({
      where,
      orderBy: { count: "desc" }, // Сортировка: самые популярные сверху
      skip: offset,
      take: limit,
    }),
  ]);

  return c.json({
    meta: {
      total,
      limit,
      offset,
    },
    data: items,
  });
});

/**
 * GET /stats/summary (Опционально)
 *
 * Возвращает общую статистику: сколько всего репозиториев отслеживается
 * и сумма всех звезд.
 */
starsRouter.get("/summary", async (c) => {
  const [totalRepos, totalStars] = await Promise.all([
    prisma.repoStar.count(),
    prisma.repoStar.aggregate({
      _sum: {
        count: true,
      },
    }),
  ]);

  return c.json({
    totalRepos,
    totalStars: totalStars._sum.count ?? 0,
  });
});