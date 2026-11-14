import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";

const WORDS_PER_MINUTE = 230;
const MAX_TEXT_LENGTH = 100_000;

export interface TextStats {
  characters: number;
  words: number;
  sentences: number;
  readingMinutes: number;
}

export function textStats(text: string): TextStats {
  const words = text.trim() ? text.trim().split(/\s+/u).length : 0;
  const sentences = text.split(/[.!?]+(?:\s|$)/u).filter((part) => part.trim()).length;
  return {
    characters: [...text].length,
    words,
    sentences,
    readingMinutes: Math.ceil(words / WORDS_PER_MINUTE),
  };
}

export interface ZonedTime {
  timeZone: string;
  iso: string;
  local: string;
}

// Throws a RangeError with a readable message when the zone is unknown, which the SDK turns into a tool error.
export function zonedTime(timeZone: string, now: Date = new Date()): ZonedTime {
  let local: string;
  try {
    local = new Intl.DateTimeFormat("en-GB", { timeZone, dateStyle: "full", timeStyle: "long" }).format(now);
  } catch {
    throw new RangeError(`Unknown time zone "${timeZone}". Use an IANA name such as "Europe/Berlin" or "UTC".`);
  }
  return { timeZone, iso: now.toISOString(), local };
}

const TextStatsOutput = z.object({
  characters: z.number().int().nonnegative(),
  words: z.number().int().nonnegative(),
  sentences: z.number().int().nonnegative(),
  readingMinutes: z.number().int().nonnegative(),
});

const ZonedTimeOutput = z.object({
  timeZone: z.string(),
  iso: z.string(),
  local: z.string(),
});

export function registerTools(server: McpServer): void {
  server.registerTool(
    "starter_text_stats",
    {
      title: "Text statistics",
      description:
        "Count characters, words and sentences of a text and estimate its reading time. " +
        "Use it to check the length of a draft, for example 'How long does this post take to read?'.",
      inputSchema: z.strictObject({
        text: z.string().min(1).max(MAX_TEXT_LENGTH).describe("The text to analyse, up to 100,000 characters"),
      }),
      outputSchema: TextStatsOutput,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ text }) => {
      const stats = textStats(text);
      return { content: [{ type: "text", text: JSON.stringify(stats) }], structuredContent: stats };
    },
  );

  server.registerTool(
    "starter_current_time",
    {
      title: "Current time",
      description:
        "Return the current date and time in an IANA time zone, as ISO 8601 (UTC) and as readable local time. " +
        "Use it when the user asks what time it is somewhere, for example 'What time is it in Tokyo?'.",
      inputSchema: z.strictObject({
        timeZone: z.string().min(1).max(64).default("UTC").describe("IANA time zone name, for example 'Europe/Berlin'"),
      }),
      outputSchema: ZonedTimeOutput,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async ({ timeZone }) => {
      const time = zonedTime(timeZone);
      return { content: [{ type: "text", text: JSON.stringify(time) }], structuredContent: time };
    },
  );
}
