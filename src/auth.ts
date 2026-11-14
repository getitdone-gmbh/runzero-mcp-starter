import { createHash, timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";

const digest = (value: string) => createHash("sha256").update(value).digest();

// Static bearer token check; hashing both sides keeps the comparison constant-time regardless of length.
export function requireStaticBearer(expectedToken: string): RequestHandler {
  const expected = digest(expectedToken);
  return (req, res, next) => {
    const match = /^Bearer (.+)$/i.exec(req.headers.authorization ?? "");
    if (match && timingSafeEqual(digest(match[1]), expected)) {
      next();
      return;
    }
    res
      .status(401)
      .set("WWW-Authenticate", 'Bearer realm="mcp"')
      .json({ jsonrpc: "2.0", error: { code: -32001, message: "Missing or invalid bearer token" }, id: null });
  };
}
