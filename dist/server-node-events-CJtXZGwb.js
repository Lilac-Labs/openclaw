import { p as defaultRuntime } from "./entry.js";
import "./auth-profiles-BZAsA3O9.js";
import { u as normalizeMainKey } from "./session-key-DVvxnFKg.js";
import "./utils-Dk86IbEs.js";
import "./exec-B8JKbXKW.js";
import "./agent-scope-D3me2AZa.js";
import "./github-copilot-token-SLWintYd.js";
import "./pi-model-discovery-DzEIEgHL.js";
import { i as loadConfig } from "./config-B492mw06.js";
import "./manifest-registry-D5SiA3xq.js";
import "./server-context-fX4xiYRh.js";
import "./chrome-yIKmOzCO.js";
import "./control-service-BqATf0h7.js";
import "./client-DMloFP_O.js";
import "./call-DLO1BEhA.js";
import "./message-channel-BlgPSDAh.js";
import "./links-7M-j83As.js";
import { r as normalizeChannelId } from "./plugins-B7F0Ly9G.js";
import "./logging-CfEk_PnX.js";
import "./accounts-DbzMEfKN.js";
import { er as enqueueSystemEvent, on as loadSessionEntry, rr as requestHeartbeatNow } from "./loader-DJRotWxM.js";
import "./progress-Da1ehW-x.js";
import "./prompt-style-Dc0C5HC9.js";
import "./manager-B0LyaXNG.js";
import "./paths-IivnSNkP.js";
import "./sqlite-B7FPASCO.js";
import "./redact-DuEEf1p1.js";
import "./routes-D3kAaoo4.js";
import "./pi-embedded-helpers-Cx65Z-6e.js";
import "./deliver-pFMP5UiT.js";
import { g as updateSessionStore } from "./sandbox-BLyWpgSU.js";
import "./tui-formatters-B2jSoYB2.js";
import "./wsl-jBJ2sR3G.js";
import "./skills-C_rNI0Jc.js";
import "./image-CIh5aKei.js";
import "./tool-display-o-dDAlqF.js";
import "./channel-selection-DAHCVAX4.js";
import "./session-cost-usage-CcCEQNuc.js";
import "./commands-DMXF8ksk.js";
import "./pairing-store-CO6umWFP.js";
import "./login-qr-H5X3zkmU.js";
import "./pairing-labels-CHxlh3tT.js";
import "./deps-CJdvY4AA.js";
import { t as formatForLog } from "./ws-log-BP3z_g6Z.js";
import { t as agentCommand } from "./agent-BbREE1w4.js";
import { randomUUID } from "node:crypto";

//#region src/gateway/server-node-events.ts
const handleNodeEvent = async (ctx, nodeId, evt) => {
	switch (evt.event) {
		case "voice.transcript": {
			if (!evt.payloadJSON) return;
			let payload;
			try {
				payload = JSON.parse(evt.payloadJSON);
			} catch {
				return;
			}
			const obj = typeof payload === "object" && payload !== null ? payload : {};
			const text = typeof obj.text === "string" ? obj.text.trim() : "";
			if (!text) return;
			if (text.length > 2e4) return;
			const sessionKeyRaw = typeof obj.sessionKey === "string" ? obj.sessionKey.trim() : "";
			const rawMainKey = normalizeMainKey(loadConfig().session?.mainKey);
			const sessionKey = sessionKeyRaw.length > 0 ? sessionKeyRaw : rawMainKey;
			const { storePath, entry, canonicalKey } = loadSessionEntry(sessionKey);
			const now = Date.now();
			const sessionId = entry?.sessionId ?? randomUUID();
			if (storePath) await updateSessionStore(storePath, (store) => {
				store[canonicalKey] = {
					sessionId,
					updatedAt: now,
					thinkingLevel: entry?.thinkingLevel,
					verboseLevel: entry?.verboseLevel,
					reasoningLevel: entry?.reasoningLevel,
					systemSent: entry?.systemSent,
					sendPolicy: entry?.sendPolicy,
					lastChannel: entry?.lastChannel,
					lastTo: entry?.lastTo
				};
			});
			ctx.addChatRun(sessionId, {
				sessionKey,
				clientRunId: `voice-${randomUUID()}`
			});
			agentCommand({
				message: text,
				sessionId,
				sessionKey,
				thinking: "low",
				deliver: false,
				messageChannel: "node"
			}, defaultRuntime, ctx.deps).catch((err) => {
				ctx.logGateway.warn(`agent failed node=${nodeId}: ${formatForLog(err)}`);
			});
			return;
		}
		case "agent.request": {
			if (!evt.payloadJSON) return;
			let link = null;
			try {
				link = JSON.parse(evt.payloadJSON);
			} catch {
				return;
			}
			const message = (link?.message ?? "").trim();
			if (!message) return;
			if (message.length > 2e4) return;
			const channel = normalizeChannelId(typeof link?.channel === "string" ? link.channel.trim() : "") ?? void 0;
			const to = typeof link?.to === "string" && link.to.trim() ? link.to.trim() : void 0;
			const deliver = Boolean(link?.deliver) && Boolean(channel);
			const sessionKeyRaw = (link?.sessionKey ?? "").trim();
			const sessionKey = sessionKeyRaw.length > 0 ? sessionKeyRaw : `node-${nodeId}`;
			const { storePath, entry, canonicalKey } = loadSessionEntry(sessionKey);
			const now = Date.now();
			const sessionId = entry?.sessionId ?? randomUUID();
			if (storePath) await updateSessionStore(storePath, (store) => {
				store[canonicalKey] = {
					sessionId,
					updatedAt: now,
					thinkingLevel: entry?.thinkingLevel,
					verboseLevel: entry?.verboseLevel,
					reasoningLevel: entry?.reasoningLevel,
					systemSent: entry?.systemSent,
					sendPolicy: entry?.sendPolicy,
					lastChannel: entry?.lastChannel,
					lastTo: entry?.lastTo
				};
			});
			agentCommand({
				message,
				sessionId,
				sessionKey,
				thinking: link?.thinking ?? void 0,
				deliver,
				to,
				channel,
				timeout: typeof link?.timeoutSeconds === "number" ? link.timeoutSeconds.toString() : void 0,
				messageChannel: "node"
			}, defaultRuntime, ctx.deps).catch((err) => {
				ctx.logGateway.warn(`agent failed node=${nodeId}: ${formatForLog(err)}`);
			});
			return;
		}
		case "chat.subscribe": {
			if (!evt.payloadJSON) return;
			let payload;
			try {
				payload = JSON.parse(evt.payloadJSON);
			} catch {
				return;
			}
			const obj = typeof payload === "object" && payload !== null ? payload : {};
			const sessionKey = typeof obj.sessionKey === "string" ? obj.sessionKey.trim() : "";
			if (!sessionKey) return;
			ctx.nodeSubscribe(nodeId, sessionKey);
			return;
		}
		case "chat.unsubscribe": {
			if (!evt.payloadJSON) return;
			let payload;
			try {
				payload = JSON.parse(evt.payloadJSON);
			} catch {
				return;
			}
			const obj = typeof payload === "object" && payload !== null ? payload : {};
			const sessionKey = typeof obj.sessionKey === "string" ? obj.sessionKey.trim() : "";
			if (!sessionKey) return;
			ctx.nodeUnsubscribe(nodeId, sessionKey);
			return;
		}
		case "exec.started":
		case "exec.finished":
		case "exec.denied": {
			if (!evt.payloadJSON) return;
			let payload;
			try {
				payload = JSON.parse(evt.payloadJSON);
			} catch {
				return;
			}
			const obj = typeof payload === "object" && payload !== null ? payload : {};
			const sessionKey = typeof obj.sessionKey === "string" ? obj.sessionKey.trim() : `node-${nodeId}`;
			if (!sessionKey) return;
			const runId = typeof obj.runId === "string" ? obj.runId.trim() : "";
			const command = typeof obj.command === "string" ? obj.command.trim() : "";
			const exitCode = typeof obj.exitCode === "number" && Number.isFinite(obj.exitCode) ? obj.exitCode : void 0;
			const timedOut = obj.timedOut === true;
			const output = typeof obj.output === "string" ? obj.output.trim() : "";
			const reason = typeof obj.reason === "string" ? obj.reason.trim() : "";
			let text = "";
			if (evt.event === "exec.started") {
				text = `Exec started (node=${nodeId}${runId ? ` id=${runId}` : ""})`;
				if (command) text += `: ${command}`;
			} else if (evt.event === "exec.finished") {
				const exitLabel = timedOut ? "timeout" : `code ${exitCode ?? "?"}`;
				text = `Exec finished (node=${nodeId}${runId ? ` id=${runId}` : ""}, ${exitLabel})`;
				if (output) text += `\n${output}`;
			} else {
				text = `Exec denied (node=${nodeId}${runId ? ` id=${runId}` : ""}${reason ? `, ${reason}` : ""})`;
				if (command) text += `: ${command}`;
			}
			enqueueSystemEvent(text, {
				sessionKey,
				contextKey: runId ? `exec:${runId}` : "exec"
			});
			requestHeartbeatNow({ reason: "exec-event" });
			return;
		}
		default: return;
	}
};

//#endregion
export { handleNodeEvent };