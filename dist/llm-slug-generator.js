import "./paths-BZtyHNCi.js";
import "./utils-dp_OM900.js";
import "./exec-CijMSZd9.js";
import { c as resolveDefaultAgentId, r as resolveAgentDir, s as resolveAgentWorkspaceDir } from "./agent-scope-3Vx285VQ.js";
import "./deliver-CWHCRTqM.js";
import { t as runEmbeddedPiAgent } from "./pi-embedded-C52wktxW.js";
import "./pi-embedded-helpers-DsfKtujp.js";
import "./boolean-M-esQJt6.js";
import "./model-auth-Bj2a5QFS.js";
import "./config-DHJr-Z6f.js";
import "./github-copilot-token-C9IJh2Pn.js";
import "./pi-model-discovery-DzFOAbQt.js";
import "./chrome-UrBfjc6F.js";
import "./frontmatter-xwTm0734.js";
import "./paths-MnZaxqPw.js";
import "./image-CpEKpVM2.js";
import "./manager-TJ3M6bMd.js";
import "./sqlite-BrQ9tw8B.js";
import "./redact-BOIof271.js";
import "./login-qr-DpSrkgSM.js";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

//#region src/hooks/llm-slug-generator.ts
/**
* LLM-based slug generator for session memory filenames
*/
/**
* Generate a short 1-2 word filename slug from session content using LLM
*/
async function generateSlugViaLLM(params) {
	let tempSessionFile = null;
	try {
		const agentId = resolveDefaultAgentId(params.cfg);
		const workspaceDir = resolveAgentWorkspaceDir(params.cfg, agentId);
		const agentDir = resolveAgentDir(params.cfg, agentId);
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-slug-"));
		tempSessionFile = path.join(tempDir, "session.jsonl");
		const prompt = `Based on this conversation, generate a short 1-2 word filename slug (lowercase, hyphen-separated, no file extension).

Conversation summary:
${params.sessionContent.slice(0, 2e3)}

Reply with ONLY the slug, nothing else. Examples: "vendor-pitch", "api-design", "bug-fix"`;
		const result = await runEmbeddedPiAgent({
			sessionId: `slug-generator-${Date.now()}`,
			sessionKey: "temp:slug-generator",
			agentId,
			sessionFile: tempSessionFile,
			workspaceDir,
			agentDir,
			config: params.cfg,
			prompt,
			timeoutMs: 15e3,
			runId: `slug-gen-${Date.now()}`
		});
		if (result.payloads && result.payloads.length > 0) {
			const text = result.payloads[0]?.text;
			if (text) return text.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || null;
		}
		return null;
	} catch (err) {
		console.error("[llm-slug-generator] Failed to generate slug:", err);
		return null;
	} finally {
		if (tempSessionFile) try {
			await fs.rm(path.dirname(tempSessionFile), {
				recursive: true,
				force: true
			});
		} catch {}
	}
}

//#endregion
export { generateSlugViaLLM };