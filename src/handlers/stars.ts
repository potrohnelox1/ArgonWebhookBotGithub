import { prisma } from "../lib/prisma";
import type { Feature } from "../generated/prisma";
import type { StarEvent } from "../types/types-gh";

interface StarsConfig {
  step?: number;
}

/**
 * Atomically increments or decrements the star count for a repo.
 * Sends a notification every `step` stars gained/lost (default: 10).
 * Notification reflects the current trend direction.
 */
export async function handleStarEvent(
  payload: StarEvent,
  feature: Feature,
): Promise<void> {
  const config = (feature.additionalConfigs ?? {}) as StarsConfig;
  const step = config.step && config.step > 0 ? config.step : 10;

  const repoId = String(payload.repository.id);
  const repoName = payload.repository.full_name;
  const isAdded = payload.action === "created";

  await prisma.$transaction(async (tx) => {
    // Upsert: create on first star event, then atomically inc/dec
    const star = await tx.repoStar.upsert({
      where: { repoId },
      create: {
        repoId,
        repoName,
        count: isAdded ? 1 : 0,
        lastNotifiedCount: 0,
      },
      update: isAdded
        ? { count: { increment: 1 } }
        : { count: { decrement: 1 } },
    });

    const newCount = Math.max(0, star.count); // guard against going below 0
    const lastNotified = star.lastNotifiedCount;

    const prevBucket = Math.floor(lastNotified / step);
    const newBucket = Math.floor(newCount / step);

    if (newBucket !== prevBucket) {
      const gaining = newCount > lastNotified;
      const crossed = Math.abs(newBucket - prevBucket) * step;

      const message = gaining
        ? `📈 [${repoName}] +${crossed} звёзд перевалило порог — суммарно ${newCount} ⭐  (${payload.sender.login} и другие ценители)`
        : `📉 [${repoName}] −${crossed} звёзд ушло в минус — осталось ${newCount} ⭐  (кто-то отписался)`;

      // TODO: replace with your actual notification transport (Telegram, Slack, etc.)
      notify(message);

      // Update the "last notified" watermark
      await tx.repoStar.update({
        where: { repoId },
        data: { lastNotifiedCount: newCount },
      });
    }
  });
}

function notify(message: string): void {
  // Centralised notification point — swap in real transport here
  console.log(`[NOTIFY] ${message}`);
}