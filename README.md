# run.zero MCP server starter

A minimal, production-ready remote [MCP](https://modelcontextprotocol.io) server in TypeScript. It speaks Streamable HTTP, runs on Node 22 and deploys to [run.zero](https://run-zero.de) without any changes.

- Official MCP TypeScript SDK (v2), stateless: a fresh server instance per request, so it scales to more replicas as-is
- Two example tools with title, description, input and output schema and `readOnlyHint` / `destructiveHint` annotations
- `GET /healthz` for monitoring, a small info page at `/`
- Optional bearer-token auth via one environment variable
- Tests for the tools and the HTTP endpoint (initialize, `tools/list`, `tools/call`, auth)

Live demo: https://mcp-runzero-mcp-starter-d15c5da5.run-zero.app (endpoint `https://mcp-runzero-mcp-starter-d15c5da5.run-zero.app/mcp`, no auth)

## Deploy on run.zero

**One click.** Open https://dashboard.run-zero.de/?template=runzero-mcp-starter-d15c5da5, sign in, and run.zero copies this template into a new app of yours, with its own repository, build and URL.

**With your coding agent.** If your agent has the [run.zero MCP server](https://github.com/getitdone-gmbh/run-zero-mcp) connected, ask it:

> Create a new app from the run.zero template `runzero-mcp-starter-d15c5da5` and call it my-mcp-server.

It calls `runzero_adopt_template` and waits for the build.

**From your own fork.** Fork this repository, then create an app on run.zero linked to your fork and deploy it (dashboard, or `runzero_create_app` with `repo` and `runzero_deploy`). `run-zero.yaml` declares one service `mcp` on port 8080; the server is then live at `https://mcp-<app-slug>.run-zero.app/mcp`.

Node is pinned to `22.x` in `package.json`. The buildpack runs `npm run build` at image-build time, so the build tools (`typescript`, the `@types` packages) are regular dependencies.

## Run locally

```bash
npm install
npm run dev            # http://localhost:8080/mcp, reloads on change
npm test               # tool and HTTP tests
npm run build && npm start
```

Try it with the MCP Inspector:

```bash
npm run inspect        # then connect to http://localhost:8080/mcp with transport "Streamable HTTP"
```

Or add it to Claude Code:

```bash
claude mcp add --transport http starter http://localhost:8080/mcp
```

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `8080` | Port the server listens on (run.zero sets it) |
| `MCP_AUTH_TOKEN` | unset | When set, `/mcp` requires `Authorization: Bearer <token>`. `/healthz` and `/` stay public |
| `ALLOWED_HOSTS` | unset | Comma-separated host names; when set, requests with any other `Host` header are refused (DNS rebinding protection) |

On run.zero, set secrets in the dashboard or with `runzero_set_secrets`, never in `run-zero.yaml`:

```text
runzero_set_secrets app=my-mcp-server service=mcp MCP_AUTH_TOKEN=<long random string>
```

Clients then send the token as a header, for example:

```bash
claude mcp add --transport http starter https://mcp-<app-slug>.run-zero.app/mcp \
  --header "Authorization: Bearer <token>"
```

### Next step: OAuth

A static token suits personal and team use. For a public server where every user signs in with their own account, switch to OAuth 2.1 as described in the [MCP authorization spec](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization):

1. Run an authorization server. On run.zero, add a `keycloak` addon in `run-zero.yaml` and attach it to the `mcp` service.
2. Replace `requireStaticBearer` in `src/app.ts` with `requireBearerAuth` from `@modelcontextprotocol/express` and a verifier that checks the JWT against the issuer, audience and expiry.
3. Serve the protected resource metadata at `/.well-known/oauth-protected-resource` so clients find the authorization server. The SDK's [oauth example](https://github.com/modelcontextprotocol/typescript-sdk/tree/main/examples/oauth) shows the full setup.

## Add your own tools

Tools live in `src/tools.ts`. Each one gets a `snake_case` name with a prefix, a `title`, a description that says when to use it, a Zod input schema and annotations:

| Annotation | Set to `true` when the tool |
|---|---|
| `readOnlyHint` | changes nothing |
| `destructiveHint` | may delete or overwrite data (clients ask before calling it) |
| `idempotentHint` | can be repeated with the same arguments without further effect |
| `openWorldHint` | talks to an external system |

Keep shared clients (database pools, API clients) at module scope and register tools inside `createServer()` in `src/server.ts`. Errors thrown in a tool reach the model as the tool result, so write messages that say how to recover. Add a test in `test/` for every tool.

## List it in the official MCP Registry

The [MCP Registry](https://registry.modelcontextprotocol.io) is where clients and directories discover servers. A remote server needs no package, only a `server.json`:

```json
{
  "$schema": "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json",
  "name": "io.github.<your-github-user>/<server-name>",
  "title": "My MCP server",
  "description": "What it does, in one sentence.",
  "version": "1.0.0",
  "remotes": [
    { "type": "streamable-http", "url": "https://mcp-<app-slug>.run-zero.app/mcp" }
  ]
}
```

1. Install the publisher: `brew install mcp-publisher` (or download it from the [registry releases](https://github.com/modelcontextprotocol/registry/releases)).
2. Sign in to prove the namespace. `mcp-publisher login github` covers `io.github.<user>/*`. For your own domain use `mcp-publisher login dns --domain example.com --private-key <key>` (TXT record) or `login http` (file under `/.well-known/mcp-registry-auth`), which gives you names like `com.example/<server-name>`.
3. Publish from the folder that holds `server.json`: `mcp-publisher publish`. Raise `version` before every new publish.

Once it is in the registry, directories such as the [run.zero MCP directory](https://run-zero.de/mcp-servers) pick it up automatically.

## License

MIT, see [LICENSE](LICENSE).
