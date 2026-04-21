import { Hono } from "hono";
import { prisma } from "../lib/prisma";

import { getEnabledFeature } from "../handlers/feature-check";
import { handleStarEvent } from "../handlers/stars";
export const webhookRouter = new Hono();
import type {
  PushEvent,
  PullRequestEvent,
  DeploymentEvent,
  ForkEvent,
  ReleaseEvent,
  RepositoryEvent,
  StarEvent,
  PageBuildEvent,
  PackageEvent,
} from "../types/types-gh";

// ── GitHub event name → features table key mapping ───────────────────────────
const EVENT_FEATURE_MAP: Record<string, string> = {
  deployment: "deployments",
  fork: "forks",
  package: "packages",
  page_build: "page_build",
  pull_request: "pull_request",
  push: "push",
  // registry_package is the real GH event name for registry packages
  registry_package: "registry_packages",
  release: "release",
  repository: "repository",
  star: "star",
};
webhookRouter.post("/", async (c) => {
  const eventType = c.req.header("X-GitHub-Event") ?? "unknown";
  const body = await c.req.json();

  // ── 1. Always persist the raw event ─────────────────────────────────────────
  if (eventType !== "ping") {
    await prisma.rawEvent.create({
      data: {
        type: eventType,
        eventData: body,
      },
    });
  }

  // ── 2. ping: just acknowledge ────────────────────────────────────────────────
  if (eventType === "ping") {
    console.log("[ping] Webhook connected:", body.zen);
    return c.json({ ok: true });
  }

  // ── 3. Check feature flag ────────────────────────────────────────────────────
  const featureKey = EVENT_FEATURE_MAP[eventType];
  if (!featureKey) {
    console.warn(`[webhook] No feature mapping for event: ${eventType}`);
    return c.json({ ok: true });
  }

  const feature = await getEnabledFeature(featureKey);
  if (!feature) {
    console.log(
      `[webhook] Feature "${featureKey}" is disabled — skipping processing`
    );
    return c.json({ ok: true });
  }

  // ── 4. Dispatch to the right handler ─────────────────────────────────────────
  try {
    switch (eventType) {
      case "push": {
        const payload = body as PushEvent;
        console.log(
          `[push] ${payload.ref} by ${payload.pusher.name} (${
            payload.commits?.length ?? 0
          } commits)`
        );
        break;
      }

      case "pull_request": {
        const payload = body as PullRequestEvent;
        console.log(
          `[pull_request] ${payload.action} #${payload.number} "${payload.pull_request.title}"`
        );
        break;
      }

      case "deployment": {
        const payload = body as DeploymentEvent;
        console.log(`[deployment] env=${payload.deployment.environment}`);
        break;
      }

      case "fork": {
        const payload = body as ForkEvent;
        console.log(
          `[fork] forked by ${payload.forkee.owner.login} → ${payload.forkee.full_name}`
        );
        break;
      }

      case "release": {
        const payload = body as ReleaseEvent;
        console.log(
          `[release] ${payload.action} tag=${payload.release.tag_name}`
        );
        break;
      }

      case "repository": {
        const payload = body as RepositoryEvent;
        console.log(
          `[repository] ${payload.action} ${payload.repository.full_name}`
        );
        break;
      }

      case "star": {
        const payload = body as StarEvent;
        console.log(`[star] ${payload.action} by ${payload.sender.login}`);
        await handleStarEvent(payload, feature);
        break;
      }

      case "page_build": {
        const payload = body as PageBuildEvent;
        console.log(`[page_build] status=${payload.build.status}`);
        break;
      }

      case "package":
      case "registry_package": {
        const payload = body as PackageEvent;
        console.log(
          `[${eventType}] ${payload.action} package=${payload.package.name}`
        );
        break;
      }

      default:
        console.warn(`[webhook] Unhandled event type: ${eventType}`);
    }
  } catch (err) {
    console.error(`[webhook] Handler error for ${eventType}:`, err);
    // Still return 200 so GitHub doesn't retry — the raw event is already saved
  }

  return c.json({ ok: true });
});
