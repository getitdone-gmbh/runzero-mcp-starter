import { fileURLToPath } from "node:url";
import { createMcpExpressApp } from "@modelcontextprotocol/express";
import { toNodeHandler } from "@modelcontextprotocol/node";
import { createMcpHandler } from "@modelcontextprotocol/server";
import express, { type Express } from "express";
import { requireStaticBearer } from "./auth.js";
import { createServer, SERVER_NAME, SERVER_VERSION } from "./server.js";

export interface AppConfig {
  authToken?: string;
  allowedHosts?: string[];
}

const publicDir = fileURLToPath(new URL("../public", import.meta.url));

export function createApp({ authToken, allowedHosts }: AppConfig = {}): Express {
  const app = createMcpExpressApp({ host: "0.0.0.0", allowedHosts });
  const mcp = toNodeHandler(createMcpHandler(createServer));
  app.disable("x-powered-by");
  const guards = authToken ? [requireStaticBearer(authToken)] : [];

  app.get("/healthz", (_req, res) => {
    res.json({ status: "ok", name: SERVER_NAME, version: SERVER_VERSION });
  });
  app.all("/mcp", ...guards, (req, res) => void mcp(req, res, req.body));
  app.use(express.static(publicDir));
  return app;
}
