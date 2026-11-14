import { strict as assert } from "node:assert";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { createApp, type AppConfig } from "../src/app.js";

async function start(config: AppConfig): Promise<{ server: Server; base: string }> {
  const server = createApp(config).listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  return { server, base: `http://127.0.0.1:${(server.address() as AddressInfo).port}` };
}

async function connect(base: string, token?: string): Promise<Client> {
  const client = new Client({ name: "test", version: "1.0.0" });
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  await client.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`), { requestInit: { headers } }));
  return client;
}

describe("without auth", () => {
  let server: Server;
  let base: string;
  before(async () => ({ server, base } = await start({})));
  after(() => server.close());

  it("serves health", async () => {
    const response = await fetch(`${base}/healthz`);
    assert.equal(response.status, 200);
    assert.equal(((await response.json()) as { status: string }).status, "ok");
  });

  it("lists the tools with annotations", async () => {
    const client = await connect(base);
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map((tool) => tool.name).sort(), ["starter_current_time", "starter_text_stats"]);
    for (const tool of tools) {
      assert.ok(tool.title, `${tool.name} has a title`);
      assert.equal(tool.annotations?.readOnlyHint, true);
      assert.equal(tool.annotations?.destructiveHint, false);
    }
    await client.close();
  });

  it("calls a tool", async () => {
    const client = await connect(base);
    const result = await client.callTool({ name: "starter_text_stats", arguments: { text: "One two three." } });
    assert.ok(!result.isError);
    assert.deepEqual(result.structuredContent, { characters: 14, words: 3, sentences: 1, readingMinutes: 1 });
    await client.close();
  });

  it("returns a tool error for bad input", async () => {
    const client = await connect(base);
    const result = await client.callTool({ name: "starter_current_time", arguments: { timeZone: "Nowhere/Land" } });
    assert.equal(result.isError, true);
    await client.close();
  });

  it("serves several requests at once", async () => {
    const clients = await Promise.all([connect(base), connect(base), connect(base)]);
    const results = await Promise.all(clients.map((client) => client.callTool({ name: "starter_current_time", arguments: {} })));
    assert.ok(results.every((result) => !result.isError));
    await Promise.all(clients.map((client) => client.close()));
  });
});

describe("with auth", () => {
  let server: Server;
  let base: string;
  before(async () => ({ server, base } = await start({ authToken: "test-token" })));
  after(() => server.close());

  it("rejects a request without token", async () => {
    const response = await fetch(`${base}/mcp`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });
    assert.equal(response.status, 401);
    assert.match(response.headers.get("www-authenticate") ?? "", /^Bearer/);
  });

  it("rejects a wrong token", async () => {
    await assert.rejects(connect(base, "wrong"));
  });

  it("accepts the right token", async () => {
    const client = await connect(base, "test-token");
    assert.equal((await client.listTools()).tools.length, 2);
    await client.close();
  });

  it("keeps health public", async () => {
    assert.equal((await fetch(`${base}/healthz`)).status, 200);
  });
});
