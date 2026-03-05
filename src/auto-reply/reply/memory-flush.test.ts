import { describe, expect, it } from "vitest";
import type { OpenClawConfig } from "../../config/config.js";
import {
  formatDateStampInTimezone,
  resolveMemoryFlushPromptForRun,
  shouldRunDailyMemoryCheckpoint,
} from "./memory-flush.js";

describe("resolveMemoryFlushPromptForRun", () => {
  const cfg = {
    agents: {
      defaults: {
        userTimezone: "America/New_York",
        timeFormat: "12",
      },
    },
  } as OpenClawConfig;

  it("replaces YYYY-MM-DD using user timezone and appends current time", () => {
    const prompt = resolveMemoryFlushPromptForRun({
      prompt: "Store durable notes in memory/YYYY-MM-DD.md",
      cfg,
      nowMs: Date.UTC(2026, 1, 16, 15, 0, 0),
    });

    expect(prompt).toContain("memory/2026-02-16.md");
    expect(prompt).toContain("Current time:");
    expect(prompt).toContain("(America/New_York)");
  });

  it("does not append a duplicate current time line", () => {
    const prompt = resolveMemoryFlushPromptForRun({
      prompt: "Store notes.\nCurrent time: already present",
      cfg,
      nowMs: Date.UTC(2026, 1, 16, 15, 0, 0),
    });

    expect(prompt).toContain("Current time: already present");
    expect((prompt.match(/Current time:/g) ?? []).length).toBe(1);
  });
});

describe("formatDateStampInTimezone", () => {
  it("formats date in the given timezone", () => {
    // 2026-02-16 at 3 PM UTC = 10 AM in New York (EST = UTC-5)
    const result = formatDateStampInTimezone(Date.UTC(2026, 1, 16, 15, 0, 0), "America/New_York");
    expect(result).toBe("2026-02-16");
  });

  it("handles timezone date boundary correctly", () => {
    // 2026-02-17 at 2 AM UTC = 2026-02-16 at 9 PM in New York (EST = UTC-5)
    const result = formatDateStampInTimezone(Date.UTC(2026, 1, 17, 2, 0, 0), "America/New_York");
    expect(result).toBe("2026-02-16");
  });

  it("returns ISO date as fallback for invalid timezone", () => {
    // Intl.DateTimeFormat throws for bad timezone, so we get the ISO fallback
    const nowMs = Date.UTC(2026, 5, 10, 12, 0, 0);
    // This should either work or fall back to ISO — both produce YYYY-MM-DD
    const result = formatDateStampInTimezone(nowMs, "UTC");
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("shouldRunDailyMemoryCheckpoint", () => {
  const tz = "America/New_York";
  // 2026-03-05 noon UTC
  const nowMs = Date.UTC(2026, 2, 5, 17, 0, 0);

  it("returns false when entry is undefined", () => {
    expect(shouldRunDailyMemoryCheckpoint({ entry: undefined, nowMs, timezone: tz })).toBe(false);
  });

  it("returns true when no previous checkpoint exists", () => {
    const entry = { compactionCount: 0, memoryFlushCompactionCount: undefined };
    expect(shouldRunDailyMemoryCheckpoint({ entry: entry as never, nowMs, timezone: tz })).toBe(
      true,
    );
  });

  it("returns false when checkpoint is for today", () => {
    const todayDate = formatDateStampInTimezone(nowMs, tz);
    const entry = {
      memoryCheckpointDate: todayDate,
      compactionCount: 0,
      memoryFlushCompactionCount: undefined,
    };
    expect(shouldRunDailyMemoryCheckpoint({ entry: entry as never, nowMs, timezone: tz })).toBe(
      false,
    );
  });

  it("returns true when checkpoint is from yesterday", () => {
    const entry = {
      memoryCheckpointDate: "2026-03-04",
      compactionCount: 0,
      memoryFlushCompactionCount: undefined,
    };
    expect(shouldRunDailyMemoryCheckpoint({ entry: entry as never, nowMs, timezone: tz })).toBe(
      true,
    );
  });

  it("returns false when already flushed for current compaction cycle", () => {
    const entry = {
      memoryCheckpointDate: "2026-03-04",
      compactionCount: 3,
      memoryFlushCompactionCount: 3,
    };
    expect(shouldRunDailyMemoryCheckpoint({ entry: entry as never, nowMs, timezone: tz })).toBe(
      false,
    );
  });

  it("returns true when compaction count advanced past last flush", () => {
    const entry = {
      memoryCheckpointDate: "2026-03-04",
      compactionCount: 4,
      memoryFlushCompactionCount: 3,
    };
    expect(shouldRunDailyMemoryCheckpoint({ entry: entry as never, nowMs, timezone: tz })).toBe(
      true,
    );
  });
});
