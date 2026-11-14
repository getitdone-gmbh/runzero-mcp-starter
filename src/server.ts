import { McpServer } from "@modelcontextprotocol/server";
import { registerTools } from "./tools.js";

export const SERVER_NAME = "runzero-mcp-starter";
export const SERVER_VERSION = "1.0.0";

// A fresh instance per HTTP request keeps the server stateless, so it scales to more replicas as-is.
export function createServer(): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });
  registerTools(server);
  return server;
}
