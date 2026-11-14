import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { textStats, zonedTime } from "../src/tools.js";

describe("textStats", () => {
  it("counts words, sentences and characters", () => {
    assert.deepEqual(textStats("Hello world. How are you?"), { characters: 25, words: 5, sentences: 2, readingMinutes: 1 });
  });

  it("returns zero for whitespace", () => {
    assert.deepEqual(textStats("   "), { characters: 3, words: 0, sentences: 0, readingMinutes: 0 });
  });

  it("counts emoji and umlauts as single characters", () => {
    assert.equal(textStats("Grüße 👋").characters, 7);
  });
});

describe("zonedTime", () => {
  const now = new Date("2026-11-14T12:00:00Z");

  it("formats a known zone", () => {
    const result = zonedTime("Europe/Berlin", now);
    assert.equal(result.iso, "2026-11-14T12:00:00.000Z");
    assert.match(result.local, /13:00:00/);
  });

  it("rejects an unknown zone with a recovery hint", () => {
    assert.throws(() => zonedTime("Mars/Olympus", now), /Use an IANA name/);
  });
});
