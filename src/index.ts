#!/usr/bin/env node
import { createApp } from "./app.js";
import { SERVER_NAME } from "./server.js";

const port = Number(process.env.PORT ?? 8080);
const authToken = process.env.MCP_AUTH_TOKEN || undefined;
const allowedHosts = process.env.ALLOWED_HOSTS?.split(",").map((host) => host.trim()).filter(Boolean);

createApp({ authToken, allowedHosts: allowedHosts?.length ? allowedHosts : undefined }).listen(port, "0.0.0.0", () => {
  console.error(`${SERVER_NAME} listening on :${port}/mcp (auth ${authToken ? "on" : "off"})`);
});
