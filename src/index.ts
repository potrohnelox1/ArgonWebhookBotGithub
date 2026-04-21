import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";


import { eventsRouter } from "./routes/events";
import { webhookRouter } from "./routes/webhook";
import { starsRouter } from "./routes/starsRouter";


const app = new Hono();

app.route("/stars", starsRouter); 
app.route("/events", eventsRouter);
app.route("/webhook",webhookRouter)


// ── Server bootstrap ──────────────────────────────────────────────────────────
const rawPort = (process.env.PORT ?? "").trim();
const parsedPort = rawPort.length > 0 ? Number(rawPort) : Number.NaN;
const port =
  Number.isInteger(parsedPort) && parsedPort >= 0 && parsedPort <= 65535
    ? parsedPort
    : 3000;

serve({ fetch: app.fetch, port });
console.log(`Server running at http://localhost:${port}`);