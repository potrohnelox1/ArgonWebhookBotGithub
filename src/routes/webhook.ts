import { Hono } from "hono";
import { prisma } from "../lib/prisma";
import { richText, bold, plain, italic, url, type MessageEntity } from "@argon-sdk/core";

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
import { getInstanceArgonbot } from "../lib/argon-bot";

// ── GitHub event name → features table key mapping ───────────────────────────
const EVENT_FEATURE_MAP: Record<string, string> = {
  deployment: "deployments",
  fork: "forks",
  package: "packages",
  page_build: "page_build",
  pull_request: "pull_request",
  push: "push",
  registry_package: "registry_packages",
  release: "release",
  repository: "repository",
  star: "star",
};

if (!process.env.CHANNEL_ID) {
  console.log("please enter CHANNEL_ID in .env");
  process.exit(1);
}

async function sendMessageInChannelArgon(text: string, entities?: MessageEntity[]) {
  await getInstanceArgonbot().api.messages.send({
    channelId: process.env.CHANNEL_ID!,
    text,
    ...(entities ? { entities } : {}),
  });
}

webhookRouter.post("/", async (c) => {
  const eventType = c.req.header("X-GitHub-Event") ?? "unknown";
  const body = await c.req.json();
  console.log(body)
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
        const commitCount = payload.commits?.length ?? 0;
        const branch = payload.ref.replace("refs/heads/", "");
        const repository=payload.repository.name
        let msg
   
        if (payload?.created===true){
           msg = richText(
            bold("📦 New Branch"),
            plain("\n"),
            bold("📦 Repository: "),
       
            bold(repository),
            plain("\n"),
            plain("Branch: "),
            bold(branch),
            plain("\n"),
            plain("By: "),
            italic(payload.pusher.name),
            plain(` · ${commitCount} commit${commitCount !== 1 ? "s" : ""}`),
            ...(payload.compare
              ? [plain("\n"), url(payload.compare, "View diff →")]
              : [])
          );
        }else{
           msg = richText(
            bold("📦 New Push"),
            plain("\n"),  bold("📦 Repository: "),
      
            bold(repository),
            plain("\n"),
            plain("Branch: "),
            bold(branch),
            plain("\n"),
            plain("By: "),
            italic(payload.pusher.name),
            plain(` · ${commitCount} commit${commitCount !== 1 ? "s" : ""}`),
            ...(payload.compare
              ? [plain("\n"), url(payload.compare, "View diff →")]
              : [])
          );
        }
        if (payload.ref.includes("tags")){
          msg = richText(
            bold("📦 New Release"),
            plain("\n"),  bold("📦 Repository: "),
         
            bold(repository),
            plain("\n"),
            plain("Branch: "),
            bold(branch),
            plain("\n"),
            plain("By: "),
            italic(payload.pusher.name),
            plain(` · ${commitCount} commit${commitCount !== 1 ? "s" : ""}`),
            ...(payload.compare
              ? [plain("\n"), url(payload.compare, "View diff →")]
              : [])
          );
        }
        await sendMessageInChannelArgon(msg.text, msg.entities);
        console.log(`[push] ${payload.ref} by ${payload.pusher.name} (${commitCount} commits)`);
        break;
      }

      case "pull_request": {
        const payload = body as PullRequestEvent;
        const pr = payload.pull_request;
        const actionEmoji: Record<string, string> = {
          opened: "🟢",
          closed: pr.merged ? "🟣" : "🔴",
          reopened: "🔁",
          synchronize: "🔄",
        };
        const emoji = actionEmoji[payload.action] ?? "🔔";
        const statusLabel =
          payload.action === "closed" && pr.merged ? "merged" : payload.action;
        const msg = richText(
          bold(`${emoji} Pull Request ${statusLabel}`),
          plain("\n"),
          url(pr.html_url, `#${payload.number} ${pr.title}`),
          plain("\n"),
          //@ts-ignore
          italic(`${pr.head.label} → ${pr.base.label}`),
          plain("\n"),
          plain("By: "),
          italic(pr.user.login)
        );
        await sendMessageInChannelArgon(msg.text, msg.entities);
        console.log(`[pull_request] ${payload.action} #${payload.number} "${pr.title}"`);
        break;
      }

      case "deployment": {
        const payload = body as DeploymentEvent;
        const dep = payload.deployment;
        const msg = richText(
          bold("🚀 Deployment"),
          plain("\n"),
          plain("Environment: "),
          bold(dep.environment),
          plain("\n"),
          plain("Ref: "),
          italic(dep.ref),
          plain("\n"),
          plain("By: "),
          italic(payload.sender.login)
        );
        await sendMessageInChannelArgon(msg.text, msg.entities);
        console.log(`[deployment] env=${dep.environment}`);
        break;
      }

      case "fork": {
        const payload = body as ForkEvent;
        const msg = richText(
          bold("🍴 Repository Forked"),
          plain("\n"),
          plain("By: "),
          italic(payload.forkee.owner.login),
          plain(" → "),
          url(payload.forkee.html_url, payload.forkee.full_name)
        );
        await sendMessageInChannelArgon(msg.text, msg.entities);
        console.log(`[fork] forked by ${payload.forkee.owner.login} → ${payload.forkee.full_name}`);
        break;
      }

      case "release": {
        const payload = body as ReleaseEvent;
        const rel = payload.release;
        const actionEmoji: Record<string, string> = {
          published: "🎉",
          created: "🆕",
          deleted: "🗑️",
          edited: "✏️",
          prereleased: "🧪",
          released: "🚀",
        };
        const emoji = actionEmoji[payload.action] ?? "📣";
        const msg = richText(
          bold(`${emoji} Release ${payload.action}`),
          plain("\n"),
          url(rel.html_url, rel.tag_name + (rel.name ? ` — ${rel.name}` : "")),
          ...(rel.prerelease ? [plain("\n"), italic("Pre-release")] : []),
          plain("\n"),
          plain("By: "),
          italic(rel.author.login)
        );
        await sendMessageInChannelArgon(msg.text, msg.entities);
        console.log(`[release] ${payload.action} tag=${rel.tag_name}`);
        break;
      }

      case "repository": {
        const payload = body as RepositoryEvent;
        const repo = payload.repository;
        const actionEmoji: Record<string, string> = {
          created: "🆕",
          deleted: "🗑️",
          archived: "📦",
          unarchived: "📂",
          publicized: "🌍",
          privatized: "🔒",
          renamed: "✏️",
          transferred: "📤",
        };
        const emoji = actionEmoji[payload.action] ?? "📁";
        const msg = richText(
          bold(`${emoji} Repository ${payload.action}`),
          plain("\n"),
          url(repo.html_url, repo.full_name),
          ...(repo.description
            ? [plain("\n"), italic(repo.description)]
            : []),
          plain("\n"),
          plain("By: "),
          italic(payload.sender.login)
        );
        await sendMessageInChannelArgon(msg.text, msg.entities);
        console.log(`[repository] ${payload.action} ${repo.full_name}`);
        break;
      }

      case "star": {
        const payload = body as StarEvent;
        const repo = payload.repository;
        const isAdded = payload.action === "created";
        const msg = richText(
          bold(isAdded ? "⭐ New Star!" : "💔 Star Removed"),
          plain("\n"),
          italic(payload.sender.login),
          plain(isAdded ? " starred " : " unstarred "),
          url(repo.html_url, repo.full_name),
          plain("\n"),
          plain("Total stars: "),
          bold(String(repo.stargazers_count))
        );
        await sendMessageInChannelArgon(msg.text, msg.entities);
        console.log(`[star] ${payload.action} by ${payload.sender.login}`);
        await handleStarEvent(payload, feature);
        break;
      }

      case "page_build": {
        const payload = body as PageBuildEvent;
        const build = payload.build;
        const statusEmoji: Record<string, string> = {
          built: "✅",
          building: "🔨",
          errored: "❌",
          queued: "⏳",
        };
        const emoji = statusEmoji[build.status] ?? "📄";
        const msg = richText(
          bold(`${emoji} Pages Build`),
          plain("\n"),
          plain("Status: "),
          bold(build.status),
          ...(build.error?.message
            ? [plain("\n"), italic(`Error: ${build.error.message}`)]
            : []),
          plain("\n"),
          plain("By: "),
          italic(payload.sender.login)
        );
        await sendMessageInChannelArgon(msg.text, msg.entities);
        console.log(`[page_build] status=${build.status}`);
        break;
      }

      case "package": {
        const payload = body as PackageEvent;
        const pkg = payload.package;
        const msg = richText(
          bold("📦 Package"),
          plain(` ${payload.action}`),
          plain("\n"),
          plain("Name: "),
          bold(pkg.name),
          plain(` · `),
          italic(pkg.package_type),
          ...(pkg.package_version?.html_url
            ? [plain("\n"), url(pkg.package_version.html_url, "View package →")]
            : []),
          plain("\n"),
          plain("By: "),
          italic(payload.sender.login)
        );
        await sendMessageInChannelArgon(msg.text, msg.entities);
        console.log(`[package] ${payload.action} package=${pkg.name}`);
        break;
      }
      case "registry_package": {
        const payload = body as PackageEvent;
        const pkg = payload.package;
        const msg = richText(
          bold("📦 Package"),
          plain(` ${payload.action}`),
          plain("\n"),
          plain("Name: "),
          bold(pkg.name),
          plain(` · `),
          italic(pkg.package_type),
          ...(pkg.package_version?.html_url
            ? [plain("\n"), url(pkg.package_version.html_url, "View package →")]
            : []),
          plain("\n"),
          plain("By: "),
          italic(payload.sender.login)
        );
        await sendMessageInChannelArgon(msg.text, msg.entities);
        console.log(`[${eventType}] ${payload.action} package=${pkg.name}`);
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