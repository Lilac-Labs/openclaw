import { execSync } from "node:child_process";

//#region src/hooks/internal-hooks.ts
/** Registry of hook handlers by event key */
const handlers = /* @__PURE__ */ new Map();
/**
* Register a hook handler for a specific event type or event:action combination
*
* @param eventKey - Event type (e.g., 'command') or specific action (e.g., 'command:new')
* @param handler - Function to call when the event is triggered
*
* @example
* ```ts
* // Listen to all command events
* registerInternalHook('command', async (event) => {
*   console.log('Command:', event.action);
* });
*
* // Listen only to /new commands
* registerInternalHook('command:new', async (event) => {
*   await saveSessionToMemory(event);
* });
* ```
*/
function registerInternalHook(eventKey, handler) {
	if (!handlers.has(eventKey)) handlers.set(eventKey, []);
	handlers.get(eventKey).push(handler);
}
/**
* Trigger a hook event
*
* Calls all handlers registered for:
* 1. The general event type (e.g., 'command')
* 2. The specific event:action combination (e.g., 'command:new')
*
* Handlers are called in registration order. Errors are caught and logged
* but don't prevent other handlers from running.
*
* @param event - The event to trigger
*/
async function triggerInternalHook(event) {
	const typeHandlers = handlers.get(event.type) ?? [];
	const specificHandlers = handlers.get(`${event.type}:${event.action}`) ?? [];
	const allHandlers = [...typeHandlers, ...specificHandlers];
	if (allHandlers.length === 0) return;
	for (const handler of allHandlers) try {
		await handler(event);
	} catch (err) {
		console.error(`Hook error [${event.type}:${event.action}]:`, err instanceof Error ? err.message : String(err));
	}
}
/**
* Create a hook event with common fields filled in
*
* @param type - The event type
* @param action - The action within that type
* @param sessionKey - The session key
* @param context - Additional context
*/
function createInternalHookEvent(type, action, sessionKey, context = {}) {
	return {
		type,
		action,
		sessionKey,
		context,
		timestamp: /* @__PURE__ */ new Date(),
		messages: []
	};
}
function isAgentBootstrapEvent(event) {
	if (event.type !== "agent" || event.action !== "bootstrap") return false;
	const context = event.context;
	if (!context || typeof context !== "object") return false;
	if (typeof context.workspaceDir !== "string") return false;
	return Array.isArray(context.bootstrapFiles);
}

//#endregion
//#region src/agents/date-time.ts
let cachedTimeFormat;
function resolveUserTimezone(configured) {
	const trimmed = configured?.trim();
	if (trimmed) try {
		new Intl.DateTimeFormat("en-US", { timeZone: trimmed }).format(/* @__PURE__ */ new Date());
		return trimmed;
	} catch {}
	return Intl.DateTimeFormat().resolvedOptions().timeZone?.trim() || "UTC";
}
function resolveUserTimeFormat(preference) {
	if (preference === "12" || preference === "24") return preference;
	if (cachedTimeFormat) return cachedTimeFormat;
	cachedTimeFormat = detectSystemTimeFormat() ? "24" : "12";
	return cachedTimeFormat;
}
function normalizeTimestamp(raw) {
	if (raw == null) return;
	let timestampMs;
	if (raw instanceof Date) timestampMs = raw.getTime();
	else if (typeof raw === "number" && Number.isFinite(raw)) timestampMs = raw < 0xe8d4a51000 ? Math.round(raw * 1e3) : Math.round(raw);
	else if (typeof raw === "string") {
		const trimmed = raw.trim();
		if (!trimmed) return;
		if (/^\d+(\.\d+)?$/.test(trimmed)) {
			const num = Number(trimmed);
			if (Number.isFinite(num)) if (trimmed.includes(".")) timestampMs = Math.round(num * 1e3);
			else if (trimmed.length >= 13) timestampMs = Math.round(num);
			else timestampMs = Math.round(num * 1e3);
		} else {
			const parsed = Date.parse(trimmed);
			if (!Number.isNaN(parsed)) timestampMs = parsed;
		}
	}
	if (timestampMs === void 0 || !Number.isFinite(timestampMs)) return;
	return {
		timestampMs,
		timestampUtc: new Date(timestampMs).toISOString()
	};
}
function withNormalizedTimestamp(value, rawTimestamp) {
	const normalized = normalizeTimestamp(rawTimestamp);
	if (!normalized) return value;
	return {
		...value,
		timestampMs: typeof value.timestampMs === "number" && Number.isFinite(value.timestampMs) ? value.timestampMs : normalized.timestampMs,
		timestampUtc: typeof value.timestampUtc === "string" && value.timestampUtc.trim() ? value.timestampUtc : normalized.timestampUtc
	};
}
function detectSystemTimeFormat() {
	if (process.platform === "darwin") try {
		const result = execSync("defaults read -g AppleICUForce24HourTime 2>/dev/null", {
			encoding: "utf8",
			timeout: 500
		}).trim();
		if (result === "1") return true;
		if (result === "0") return false;
	} catch {}
	if (process.platform === "win32") try {
		const result = execSync("powershell -Command \"(Get-Culture).DateTimeFormat.ShortTimePattern\"", {
			encoding: "utf8",
			timeout: 1e3
		}).trim();
		if (result.startsWith("H")) return true;
		if (result.startsWith("h")) return false;
	} catch {}
	try {
		const sample = new Date(2e3, 0, 1, 13, 0);
		return new Intl.DateTimeFormat(void 0, { hour: "numeric" }).format(sample).includes("13");
	} catch {
		return false;
	}
}
function ordinalSuffix(day) {
	if (day >= 11 && day <= 13) return "th";
	switch (day % 10) {
		case 1: return "st";
		case 2: return "nd";
		case 3: return "rd";
		default: return "th";
	}
}
function formatUserTime(date, timeZone, format) {
	const use24Hour = format === "24";
	try {
		const parts = new Intl.DateTimeFormat("en-US", {
			timeZone,
			weekday: "long",
			year: "numeric",
			month: "long",
			day: "numeric",
			hour: use24Hour ? "2-digit" : "numeric",
			minute: "2-digit",
			hourCycle: use24Hour ? "h23" : "h12"
		}).formatToParts(date);
		const map = {};
		for (const part of parts) if (part.type !== "literal") map[part.type] = part.value;
		if (!map.weekday || !map.year || !map.month || !map.day || !map.hour || !map.minute) return;
		const dayNum = parseInt(map.day, 10);
		const suffix = ordinalSuffix(dayNum);
		const timePart = use24Hour ? `${map.hour}:${map.minute}` : `${map.hour}:${map.minute} ${map.dayPeriod ?? ""}`.trim();
		return `${map.weekday}, ${map.month} ${dayNum}${suffix}, ${map.year} — ${timePart}`;
	} catch {
		return;
	}
}

//#endregion
export { createInternalHookEvent as a, triggerInternalHook as c, withNormalizedTimestamp as i, resolveUserTimeFormat as n, isAgentBootstrapEvent as o, resolveUserTimezone as r, registerInternalHook as s, formatUserTime as t };