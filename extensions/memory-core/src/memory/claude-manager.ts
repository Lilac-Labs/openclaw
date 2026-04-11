import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile as fsReadFile, stat, writeFile, mkdir } from "node:fs/promises";
import { copyFile } from "node:fs/promises";
import path from "node:path";
import { createSubsystemLogger } from "openclaw/plugin-sdk/memory-core-host-engine-foundation";
import {
  type ResolvedClaudeConfig,
  type MemoryEmbeddingProbeResult,
  type MemoryProviderStatus,
  type MemorySearchManager,
  type MemorySearchResult,
  type MemorySource,
  type MemorySyncProgressUpdate,
} from "openclaw/plugin-sdk/memory-core-host-engine-storage";

const log = createSubsystemLogger("memory:claude");

const SEARCH_PROMPT_TEMPLATE = (query: string) =>
  `Search through the session files and memory files for: ${query}

I want file paths, exact timestamps from the data, and relevant excerpts (quote actual message content, not summaries).

For .jsonl session files: extract the actual "text" field from message entries. Include the timestamp from the JSONL entry.
For .md memory files: quote the relevant section directly.

Output each match in this format, separated by ---:

[2026-04-07 19:34] sessions/65d81ff6.jsonl

User (2026-04-07T19:30:12Z): "Can you help me set up a proxy server on port 18800?"
Assistant (2026-04-07T19:30:45Z): "I'll set up a proxy server on port 18800 that bridges mobile connections through a Cloudflare tunnel..."

---

[2026-04-09 16:42] memory/2026-04-09.md

## Proxy architecture
- Port 18800 for REST + WS
- Cloudflare tunnel auto-starts on launch

---

After the last result, add this line:
> To read full file contents, use memory_get with the file path above.

---`;

export class ClaudeMemoryManager implements MemorySearchManager {
  private readonly config: ResolvedClaudeConfig;

  constructor(config: ResolvedClaudeConfig) {
    this.config = config;
  }

  async search(
    query: string,
    _opts?: { maxResults?: number; minScore?: number; sessionKey?: string },
  ): Promise<MemorySearchResult[]> {
    const prompt = SEARCH_PROMPT_TEMPLATE(query);
    const settingsPath = await this.ensureSearchSettings();

    const args = [
      "-p",
      prompt,
      "--model",
      "sonnet",
      "--output-format",
      "stream-json",
      "--add-dir",
      this.config.sessionsDir,
      "--add-dir",
      this.config.workspaceDir,
      "--settings",
      settingsPath,
    ];

    try {
      const { text, sessionId } = await this.runClaude(args);
      if (sessionId) {
        await this.copySessionJsonl(sessionId);
      }
      return this.parseResults(text);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log.warn(`claude search failed: ${message}`);
      throw err;
    }
  }

  async readFile(params: {
    relPath: string;
    from?: number;
    lines?: number;
  }): Promise<{ text: string; path: string }> {
    const relPath = params.relPath?.trim();
    if (!relPath) {
      throw new Error("path required");
    }

    // Try workspace first, then sessions dir
    let absPath = path.join(this.config.workspaceDir, relPath);
    try {
      await stat(absPath);
    } catch {
      absPath = path.join(this.config.sessionsDir, relPath);
      try {
        await stat(absPath);
      } catch {
        return { text: "", path: relPath };
      }
    }

    try {
      const content = await fsReadFile(absPath, "utf-8");
      const allLines = content.split("\n");
      const start = (params.from ?? 1) - 1;
      const count = params.lines ?? allLines.length;
      const text = allLines.slice(start, start + count).join("\n");
      return { text, path: relPath };
    } catch {
      return { text: "", path: relPath };
    }
  }

  status(): MemoryProviderStatus {
    return {
      backend: "claude",
      provider: "claude-cli",
      custom: { type: "llm-search" },
    };
  }

  async sync(_params?: {
    reason?: string;
    force?: boolean;
    sessionFiles?: string[];
    progress?: (update: MemorySyncProgressUpdate) => void;
  }): Promise<void> {
    // No index to maintain — no-op
  }

  async probeEmbeddingAvailability(): Promise<MemoryEmbeddingProbeResult> {
    return { ok: false, error: "Claude backend does not use embeddings" };
  }

  async probeVectorAvailability(): Promise<boolean> {
    return false;
  }

  async close(): Promise<void> {
    // Nothing to clean up
  }

  // ── Private helpers ──────────────────────────────────────────

  private async ensureSearchSettings(): Promise<string> {
    const home = process.env.HOME ?? "/tmp";
    const settingsPath = path.join(home, ".openclaw", "claude-search-settings.json");
    if (!existsSync(settingsPath)) {
      await mkdir(path.dirname(settingsPath), { recursive: true });
      const settings = { hooks: {}, enabledPlugins: {}, skipDangerousModePermissionPrompt: true };
      await writeFile(settingsPath, JSON.stringify(settings, null, 2));
    }
    return settingsPath;
  }

  private async runClaude(args: string[]): Promise<{ text: string; sessionId: string | null }> {
    // Resolve claude binary path: same bin/ dir as the running node process
    // (e.g. runtimes/node/bin/node → runtimes/node/bin/claude)
    const claudeBin = path.join(path.dirname(process.execPath), "claude");
    log.info(`spawning claude at: ${claudeBin}`);

    return new Promise((resolve, reject) => {
      const child = spawn(claudeBin, args, {
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env },
      });

      const chunks: Buffer[] = [];
      child.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));

      let stderr = "";
      child.stderr.on("data", (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      child.on("error", (err) => {
        reject(new Error(`Failed to spawn claude: ${err.message}`));
      });

      child.on("close", (code) => {
        const raw = Buffer.concat(chunks).toString("utf-8");

        if (code !== 0 && !raw.trim()) {
          reject(new Error(`claude exited with code ${code}: ${stderr.trim() || "no output"}`));
          return;
        }

        let sessionId: string | null = null;
        let text = "";

        for (const line of raw.split("\n")) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);
            // Extract session_id from the init event
            if (event.type === "system" && event.session_id) {
              sessionId = event.session_id;
            }
            // Collect text from assistant messages
            if (event.type === "assistant" && event.message?.content) {
              for (const block of event.message.content) {
                if (block.type === "text" && block.text) {
                  text += block.text;
                }
              }
            }
            // Also grab result text as fallback
            if (event.type === "result" && event.result && !text) {
              text = event.result;
            }
          } catch {
            // Skip non-JSON lines
          }
        }

        resolve({ text, sessionId });
      });
    });
  }

  private async copySessionJsonl(sessionId: string): Promise<void> {
    try {
      // Claude stores sessions at ~/.claude/projects/<encoded-cwd>/<sessionId>.jsonl
      // The encoded CWD replaces / with -
      const home = process.env.HOME ?? "";
      const cwd = process.cwd();
      const encodedCwd = cwd.replace(/\//g, "-");
      const sourcePath = path.join(home, ".claude", "projects", encodedCwd, `${sessionId}.jsonl`);
      const destPath = path.join(this.config.sessionsDir, `${sessionId}.jsonl`);

      await copyFile(sourcePath, destPath);
      log.info(`copied search session ${sessionId}.jsonl to agent sessions`);
    } catch (err) {
      // Non-fatal — the search still worked, we just couldn't persist the session
      const message = err instanceof Error ? err.message : String(err);
      log.warn(`failed to copy search session jsonl: ${message}`);
    }
  }

  private parseResults(text: string): MemorySearchResult[] {
    if (!text.trim() || text.includes("NO_RESULTS")) {
      return [];
    }

    const blocks = text.split(/\n---\n|\n---$/).filter((b) => b.trim());
    const results: MemorySearchResult[] = [];

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i].trim();
      if (!block) continue;

      const source: MemorySource = block.includes("sessions") ? "sessions" : "memory";

      results.push({
        path: "",
        startLine: 0,
        endLine: 0,
        score: 1,
        snippet: block,
        source,
      });
    }

    return results;
  }
}
