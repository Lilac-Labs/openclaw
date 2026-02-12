import "../../paths-BZtyHNCi.js";
import { h as isSubagentSessionKey } from "../../session-key-nXYQSv-a.js";
import { g as resolveUserPath } from "../../utils-dp_OM900.js";
import "../../boolean-M-esQJt6.js";
import { o as isAgentBootstrapEvent, r as resolveUserTimezone } from "../../date-time-c6HTX6IW.js";
import { t as parseDurationMs } from "../../parse-duration-De_tAQSe.js";
import "../../frontmatter-xwTm0734.js";
import { t as resolveHookConfig } from "../../config-CI7EpvlP.js";
import fs from "node:fs/promises";
import path from "node:path";

//#region src/hooks/soul-evil.ts
const DEFAULT_SOUL_EVIL_FILENAME = "SOUL_EVIL.md";
function resolveSoulEvilConfigFromHook(entry, log) {
	if (!entry) return null;
	const file = typeof entry.file === "string" ? entry.file : void 0;
	if (entry.file !== void 0 && !file) log?.warn?.("soul-evil config: file must be a string");
	let chance;
	if (entry.chance !== void 0) if (typeof entry.chance === "number" && Number.isFinite(entry.chance)) chance = entry.chance;
	else log?.warn?.("soul-evil config: chance must be a number");
	let purge;
	if (entry.purge && typeof entry.purge === "object") {
		const at = typeof entry.purge.at === "string" ? entry.purge.at : void 0;
		const duration = typeof entry.purge.duration === "string" ? entry.purge.duration : void 0;
		if (entry.purge.at !== void 0 && !at) log?.warn?.("soul-evil config: purge.at must be a string");
		if (entry.purge.duration !== void 0 && !duration) log?.warn?.("soul-evil config: purge.duration must be a string");
		purge = {
			at,
			duration
		};
	} else if (entry.purge !== void 0) log?.warn?.("soul-evil config: purge must be an object");
	if (!file && chance === void 0 && !purge) return null;
	return {
		file,
		chance,
		purge
	};
}
function clampChance(value) {
	if (typeof value !== "number" || !Number.isFinite(value)) return 0;
	return Math.min(1, Math.max(0, value));
}
function parsePurgeAt(raw) {
	if (!raw) return null;
	const trimmed = raw.trim();
	const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(trimmed);
	if (!match) return null;
	const hour = Number.parseInt(match[1] ?? "", 10);
	const minute = Number.parseInt(match[2] ?? "", 10);
	if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
	return hour * 60 + minute;
}
function timeOfDayMsInTimezone(date, timeZone) {
	try {
		const parts = new Intl.DateTimeFormat("en-US", {
			timeZone,
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
			hourCycle: "h23"
		}).formatToParts(date);
		const map = {};
		for (const part of parts) if (part.type !== "literal") map[part.type] = part.value;
		if (!map.hour || !map.minute || !map.second) return null;
		const hour = Number.parseInt(map.hour, 10);
		const minute = Number.parseInt(map.minute, 10);
		const second = Number.parseInt(map.second, 10);
		if (!Number.isFinite(hour) || !Number.isFinite(minute) || !Number.isFinite(second)) return null;
		return (hour * 3600 + minute * 60 + second) * 1e3 + date.getMilliseconds();
	} catch {
		return null;
	}
}
function isWithinDailyPurgeWindow(params) {
	if (!params.at || !params.duration) return false;
	const startMinutes = parsePurgeAt(params.at);
	if (startMinutes === null) return false;
	let durationMs;
	try {
		durationMs = parseDurationMs(params.duration, { defaultUnit: "m" });
	} catch {
		return false;
	}
	if (!Number.isFinite(durationMs) || durationMs <= 0) return false;
	const dayMs = 1440 * 60 * 1e3;
	if (durationMs >= dayMs) return true;
	const nowMs = timeOfDayMsInTimezone(params.now, params.timeZone);
	if (nowMs === null) return false;
	const startMs = startMinutes * 60 * 1e3;
	const endMs = startMs + durationMs;
	if (endMs < dayMs) return nowMs >= startMs && nowMs < endMs;
	const wrappedEnd = endMs % dayMs;
	return nowMs >= startMs || nowMs < wrappedEnd;
}
function decideSoulEvil(params) {
	const evil = params.config;
	const fileName = evil?.file?.trim() || DEFAULT_SOUL_EVIL_FILENAME;
	if (!evil) return {
		useEvil: false,
		fileName
	};
	const timeZone = resolveUserTimezone(params.userTimezone);
	const now = params.now ?? /* @__PURE__ */ new Date();
	if (isWithinDailyPurgeWindow({
		at: evil.purge?.at,
		duration: evil.purge?.duration,
		now,
		timeZone
	})) return {
		useEvil: true,
		reason: "purge",
		fileName
	};
	const chance = clampChance(evil.chance);
	if (chance > 0) {
		if ((params.random ?? Math.random)() < chance) return {
			useEvil: true,
			reason: "chance",
			fileName
		};
	}
	return {
		useEvil: false,
		fileName
	};
}
async function applySoulEvilOverride(params) {
	const decision = decideSoulEvil({
		config: params.config,
		userTimezone: params.userTimezone,
		now: params.now,
		random: params.random
	});
	if (!decision.useEvil) return params.files;
	const workspaceDir = resolveUserPath(params.workspaceDir);
	const evilPath = path.join(workspaceDir, decision.fileName);
	let evilContent;
	try {
		evilContent = await fs.readFile(evilPath, "utf-8");
	} catch {
		params.log?.warn?.(`SOUL_EVIL active (${decision.reason ?? "unknown"}) but file missing: ${evilPath}`);
		return params.files;
	}
	if (!evilContent.trim()) {
		params.log?.warn?.(`SOUL_EVIL active (${decision.reason ?? "unknown"}) but file empty: ${evilPath}`);
		return params.files;
	}
	if (!params.files.some((file) => file.name === "SOUL.md")) {
		params.log?.warn?.(`SOUL_EVIL active (${decision.reason ?? "unknown"}) but SOUL.md not in bootstrap files`);
		return params.files;
	}
	let replaced = false;
	const updated = params.files.map((file) => {
		if (file.name !== "SOUL.md") return file;
		replaced = true;
		return {
			...file,
			content: evilContent,
			missing: false
		};
	});
	if (!replaced) return params.files;
	params.log?.debug?.(`SOUL_EVIL active (${decision.reason ?? "unknown"}) using ${decision.fileName}`);
	return updated;
}

//#endregion
//#region src/hooks/bundled/soul-evil/handler.ts
const HOOK_KEY = "soul-evil";
const soulEvilHook = async (event) => {
	if (!isAgentBootstrapEvent(event)) return;
	const context = event.context;
	if (context.sessionKey && isSubagentSessionKey(context.sessionKey)) return;
	const cfg = context.cfg;
	const hookConfig = resolveHookConfig(cfg, HOOK_KEY);
	if (!hookConfig || hookConfig.enabled === false) return;
	const soulConfig = resolveSoulEvilConfigFromHook(hookConfig, { warn: (message) => console.warn(`[soul-evil] ${message}`) });
	if (!soulConfig) return;
	const workspaceDir = context.workspaceDir;
	if (!workspaceDir || !Array.isArray(context.bootstrapFiles)) return;
	context.bootstrapFiles = await applySoulEvilOverride({
		files: context.bootstrapFiles,
		workspaceDir,
		config: soulConfig,
		userTimezone: cfg?.agents?.defaults?.userTimezone,
		log: {
			warn: (message) => console.warn(`[soul-evil] ${message}`),
			debug: (message) => console.debug?.(`[soul-evil] ${message}`)
		}
	});
};

//#endregion
export { soulEvilHook as default };