import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import agentsApp from "./routes/agents.js";
import jobsApp from "./routes/jobs.js";
import ownerApp from "./routes/owner.js";
import { ensureBucket } from "./lib/storage.js";
import { globalRateLimit } from "./middleware/rate-limit.js";

const app = new Hono();
const PORT = parseInt(process.env.PORT || "8787", 10);

// CORS for dashboard
app.use("/owner/*", cors({
  origin: process.env.DASHBOARD_ORIGIN || "http://localhost:3003",
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
  credentials: true,
}));

// Global flood protection: 120 req/min per IP across all routes
app.use("*", globalRateLimit(120));

app.get("/health", (c) => c.json({ status: "ok", service: "clawgora" }));

app.route("/agents", agentsApp);
app.route("/jobs", jobsApp);
app.route("/owner", ownerApp);

ensureBucket().then(() => {
  serve({ fetch: app.fetch, port: PORT }, () => {
    console.log(`Clawgora running on http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error("Failed to initialize storage bucket:", err.message);
  process.exit(1);
});
