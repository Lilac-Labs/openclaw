import { A as shouldLogVerbose, B as levelToMinLevel, E as isVerbose, H as readLoggingConfig, I as getChildLogger, L as getLogger, M as warn, O as logVerboseConsole, T as info, V as normalizeLogLevel, w as danger, z as loggingState } from "./utils-dp_OM900.js";
import { createRequire } from "node:module";
import path from "node:path";
import { Chalk } from "chalk";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";

//#region src/plugins/runtime.ts
const createEmptyRegistry = () => ({
	plugins: [],
	tools: [],
	hooks: [],
	typedHooks: [],
	channels: [],
	providers: [],
	gatewayHandlers: {},
	httpHandlers: [],
	httpRoutes: [],
	cliRegistrars: [],
	services: [],
	commands: [],
	diagnostics: []
});
const REGISTRY_STATE = Symbol.for("openclaw.pluginRegistryState");
const state = (() => {
	const globalState = globalThis;
	if (!globalState[REGISTRY_STATE]) globalState[REGISTRY_STATE] = {
		registry: createEmptyRegistry(),
		key: null
	};
	return globalState[REGISTRY_STATE];
})();
function setActivePluginRegistry(registry, cacheKey) {
	state.registry = registry;
	state.key = cacheKey ?? null;
}
function getActivePluginRegistry() {
	return state.registry;
}
function requireActivePluginRegistry() {
	if (!state.registry) state.registry = createEmptyRegistry();
	return state.registry;
}

//#endregion
//#region src/channels/registry.ts
const CHAT_CHANNEL_ORDER = [
	"telegram",
	"whatsapp",
	"discord",
	"irc",
	"googlechat",
	"slack",
	"signal",
	"imessage"
];
const CHANNEL_IDS = [...CHAT_CHANNEL_ORDER];
const DEFAULT_CHAT_CHANNEL = "whatsapp";
const CHAT_CHANNEL_META = {
	telegram: {
		id: "telegram",
		label: "Telegram",
		selectionLabel: "Telegram (Bot API)",
		detailLabel: "Telegram Bot",
		docsPath: "/channels/telegram",
		docsLabel: "telegram",
		blurb: "simplest way to get started — register a bot with @BotFather and get going.",
		systemImage: "paperplane",
		selectionDocsPrefix: "",
		selectionDocsOmitLabel: true,
		selectionExtras: ["https://openclaw.ai"]
	},
	whatsapp: {
		id: "whatsapp",
		label: "WhatsApp",
		selectionLabel: "WhatsApp (QR link)",
		detailLabel: "WhatsApp Web",
		docsPath: "/channels/whatsapp",
		docsLabel: "whatsapp",
		blurb: "works with your own number; recommend a separate phone + eSIM.",
		systemImage: "message"
	},
	discord: {
		id: "discord",
		label: "Discord",
		selectionLabel: "Discord (Bot API)",
		detailLabel: "Discord Bot",
		docsPath: "/channels/discord",
		docsLabel: "discord",
		blurb: "very well supported right now.",
		systemImage: "bubble.left.and.bubble.right"
	},
	irc: {
		id: "irc",
		label: "IRC",
		selectionLabel: "IRC (Server + Nick)",
		detailLabel: "IRC",
		docsPath: "/channels/irc",
		docsLabel: "irc",
		blurb: "classic IRC networks with DM/channel routing and pairing controls.",
		systemImage: "network"
	},
	googlechat: {
		id: "googlechat",
		label: "Google Chat",
		selectionLabel: "Google Chat (Chat API)",
		detailLabel: "Google Chat",
		docsPath: "/channels/googlechat",
		docsLabel: "googlechat",
		blurb: "Google Workspace Chat app with HTTP webhook.",
		systemImage: "message.badge"
	},
	slack: {
		id: "slack",
		label: "Slack",
		selectionLabel: "Slack (Socket Mode)",
		detailLabel: "Slack Bot",
		docsPath: "/channels/slack",
		docsLabel: "slack",
		blurb: "supported (Socket Mode).",
		systemImage: "number"
	},
	signal: {
		id: "signal",
		label: "Signal",
		selectionLabel: "Signal (signal-cli)",
		detailLabel: "Signal REST",
		docsPath: "/channels/signal",
		docsLabel: "signal",
		blurb: "signal-cli linked device; more setup (David Reagans: \"Hop on Discord.\").",
		systemImage: "antenna.radiowaves.left.and.right"
	},
	imessage: {
		id: "imessage",
		label: "iMessage",
		selectionLabel: "iMessage (imsg)",
		detailLabel: "iMessage",
		docsPath: "/channels/imessage",
		docsLabel: "imessage",
		blurb: "this is still a work in progress.",
		systemImage: "message.fill"
	}
};
const CHAT_CHANNEL_ALIASES = {
	imsg: "imessage",
	"internet-relay-chat": "irc",
	"google-chat": "googlechat",
	gchat: "googlechat"
};
const normalizeChannelKey = (raw) => {
	return raw?.trim().toLowerCase() || void 0;
};
function getChatChannelMeta(id) {
	return CHAT_CHANNEL_META[id];
}
function normalizeChatChannelId(raw) {
	const normalized = normalizeChannelKey(raw);
	if (!normalized) return null;
	const resolved = CHAT_CHANNEL_ALIASES[normalized] ?? normalized;
	return CHAT_CHANNEL_ORDER.includes(resolved) ? resolved : null;
}
function normalizeChannelId(raw) {
	return normalizeChatChannelId(raw);
}
function normalizeAnyChannelId(raw) {
	const key = normalizeChannelKey(raw);
	if (!key) return null;
	return requireActivePluginRegistry().channels.find((entry) => {
		const id = String(entry.plugin.id ?? "").trim().toLowerCase();
		if (id && id === key) return true;
		return (entry.plugin.meta.aliases ?? []).some((alias) => alias.trim().toLowerCase() === key);
	})?.plugin.id ?? null;
}

//#endregion
//#region src/terminal/progress-line.ts
let activeStream = null;
function registerActiveProgressLine(stream) {
	if (!stream.isTTY) return;
	activeStream = stream;
}
function clearActiveProgressLine() {
	if (!activeStream?.isTTY) return;
	activeStream.write("\r\x1B[2K");
}
function unregisterActiveProgressLine(stream) {
	if (!activeStream) return;
	if (stream && activeStream !== stream) return;
	activeStream = null;
}

//#endregion
//#region src/terminal/restore.ts
const RESET_SEQUENCE = "\x1B[0m\x1B[?25h\x1B[?1000l\x1B[?1002l\x1B[?1003l\x1B[?1006l\x1B[?2004l";
function reportRestoreFailure(scope, err, reason) {
	const suffix = reason ? ` (${reason})` : "";
	const message = `[terminal] restore ${scope} failed${suffix}: ${String(err)}`;
	try {
		process.stderr.write(`${message}\n`);
	} catch (writeErr) {
		console.error(`[terminal] restore reporting failed${suffix}: ${String(writeErr)}`);
	}
}
function restoreTerminalState(reason) {
	try {
		clearActiveProgressLine();
	} catch (err) {
		reportRestoreFailure("progress line", err, reason);
	}
	const stdin = process.stdin;
	if (stdin.isTTY && typeof stdin.setRawMode === "function") {
		try {
			stdin.setRawMode(false);
		} catch (err) {
			reportRestoreFailure("raw mode", err, reason);
		}
		if (typeof stdin.isPaused === "function" && stdin.isPaused()) try {
			stdin.resume();
		} catch (err) {
			reportRestoreFailure("stdin resume", err, reason);
		}
	}
	if (process.stdout.isTTY) try {
		process.stdout.write(RESET_SEQUENCE);
	} catch (err) {
		reportRestoreFailure("stdout reset", err, reason);
	}
}

//#endregion
//#region src/runtime.ts
const defaultRuntime = {
	log: (...args) => {
		clearActiveProgressLine();
		console.log(...args);
	},
	error: (...args) => {
		clearActiveProgressLine();
		console.error(...args);
	},
	exit: (code) => {
		restoreTerminalState("runtime exit");
		process.exit(code);
		throw new Error("unreachable");
	}
};

//#endregion
//#region src/terminal/ansi.ts
const ANSI_SGR_PATTERN = "\\x1b\\[[0-9;]*m";
const OSC8_PATTERN = "\\x1b\\]8;;.*?\\x1b\\\\|\\x1b\\]8;;\\x1b\\\\";
const ANSI_REGEX = new RegExp(ANSI_SGR_PATTERN, "g");
const OSC8_REGEX = new RegExp(OSC8_PATTERN, "g");

//#endregion
//#region src/logging/console.ts
const requireConfig = createRequire(import.meta.url);
function normalizeConsoleLevel(level) {
	if (isVerbose()) return "debug";
	return normalizeLogLevel(level, "info");
}
function normalizeConsoleStyle(style) {
	if (style === "compact" || style === "json" || style === "pretty") return style;
	if (!process.stdout.isTTY) return "compact";
	return "pretty";
}
function resolveConsoleSettings() {
	let cfg = loggingState.overrideSettings ?? readLoggingConfig();
	if (!cfg) if (loggingState.resolvingConsoleSettings) cfg = void 0;
	else {
		loggingState.resolvingConsoleSettings = true;
		try {
			cfg = requireConfig("../config/config.js").loadConfig?.().logging;
		} catch {
			cfg = void 0;
		} finally {
			loggingState.resolvingConsoleSettings = false;
		}
	}
	return {
		level: normalizeConsoleLevel(cfg?.consoleLevel),
		style: normalizeConsoleStyle(cfg?.consoleStyle)
	};
}
function consoleSettingsChanged(a, b) {
	if (!a) return true;
	return a.level !== b.level || a.style !== b.style;
}
function getConsoleSettings() {
	const settings = resolveConsoleSettings();
	const cached = loggingState.cachedConsoleSettings;
	if (!cached || consoleSettingsChanged(cached, settings)) loggingState.cachedConsoleSettings = settings;
	return loggingState.cachedConsoleSettings;
}
function shouldLogSubsystemToConsole(subsystem) {
	const filter = loggingState.consoleSubsystemFilter;
	if (!filter || filter.length === 0) return true;
	return filter.some((prefix) => subsystem === prefix || subsystem.startsWith(`${prefix}/`));
}

//#endregion
//#region src/logging/subsystem.ts
function shouldLogToConsole(level, settings) {
	if (settings.level === "silent") return false;
	return levelToMinLevel(level) <= levelToMinLevel(settings.level);
}
function isRichConsoleEnv() {
	const term = (process.env.TERM ?? "").toLowerCase();
	if (process.env.COLORTERM || process.env.TERM_PROGRAM) return true;
	return term.length > 0 && term !== "dumb";
}
function getColorForConsole() {
	const hasForceColor = typeof process.env.FORCE_COLOR === "string" && process.env.FORCE_COLOR.trim().length > 0 && process.env.FORCE_COLOR.trim() !== "0";
	if (process.env.NO_COLOR && !hasForceColor) return new Chalk({ level: 0 });
	return Boolean(process.stdout.isTTY || process.stderr.isTTY) || isRichConsoleEnv() ? new Chalk({ level: 1 }) : new Chalk({ level: 0 });
}
const SUBSYSTEM_COLORS = [
	"cyan",
	"green",
	"yellow",
	"blue",
	"magenta",
	"red"
];
const SUBSYSTEM_COLOR_OVERRIDES = { "gmail-watcher": "blue" };
const SUBSYSTEM_PREFIXES_TO_DROP = [
	"gateway",
	"channels",
	"providers"
];
const SUBSYSTEM_MAX_SEGMENTS = 2;
const CHANNEL_SUBSYSTEM_PREFIXES = new Set(CHAT_CHANNEL_ORDER);
function pickSubsystemColor(color, subsystem) {
	const override = SUBSYSTEM_COLOR_OVERRIDES[subsystem];
	if (override) return color[override];
	let hash = 0;
	for (let i = 0; i < subsystem.length; i += 1) hash = hash * 31 + subsystem.charCodeAt(i) | 0;
	return color[SUBSYSTEM_COLORS[Math.abs(hash) % SUBSYSTEM_COLORS.length]];
}
function formatSubsystemForConsole(subsystem) {
	const parts = subsystem.split("/").filter(Boolean);
	const original = parts.join("/") || subsystem;
	while (parts.length > 0 && SUBSYSTEM_PREFIXES_TO_DROP.includes(parts[0])) parts.shift();
	if (parts.length === 0) return original;
	if (CHANNEL_SUBSYSTEM_PREFIXES.has(parts[0])) return parts[0];
	if (parts.length > SUBSYSTEM_MAX_SEGMENTS) return parts.slice(-SUBSYSTEM_MAX_SEGMENTS).join("/");
	return parts.join("/");
}
function stripRedundantSubsystemPrefixForConsole(message, displaySubsystem) {
	if (!displaySubsystem) return message;
	if (message.startsWith("[")) {
		const closeIdx = message.indexOf("]");
		if (closeIdx > 1) {
			if (message.slice(1, closeIdx).toLowerCase() === displaySubsystem.toLowerCase()) {
				let i = closeIdx + 1;
				while (message[i] === " ") i += 1;
				return message.slice(i);
			}
		}
	}
	if (message.slice(0, displaySubsystem.length).toLowerCase() !== displaySubsystem.toLowerCase()) return message;
	const next = message.slice(displaySubsystem.length, displaySubsystem.length + 1);
	if (next !== ":" && next !== " ") return message;
	let i = displaySubsystem.length;
	while (message[i] === " ") i += 1;
	if (message[i] === ":") i += 1;
	while (message[i] === " ") i += 1;
	return message.slice(i);
}
function formatConsoleLine(opts) {
	const displaySubsystem = opts.style === "json" ? opts.subsystem : formatSubsystemForConsole(opts.subsystem);
	if (opts.style === "json") return JSON.stringify({
		time: (/* @__PURE__ */ new Date()).toISOString(),
		level: opts.level,
		subsystem: displaySubsystem,
		message: opts.message,
		...opts.meta
	});
	const color = getColorForConsole();
	const prefix = `[${displaySubsystem}]`;
	const prefixColor = pickSubsystemColor(color, displaySubsystem);
	const levelColor = opts.level === "error" || opts.level === "fatal" ? color.red : opts.level === "warn" ? color.yellow : opts.level === "debug" || opts.level === "trace" ? color.gray : color.cyan;
	const displayMessage = stripRedundantSubsystemPrefixForConsole(opts.message, displaySubsystem);
	return `${[(() => {
		if (opts.style === "pretty") return color.gray((/* @__PURE__ */ new Date()).toISOString().slice(11, 19));
		if (loggingState.consoleTimestampPrefix) return color.gray((/* @__PURE__ */ new Date()).toISOString());
		return "";
	})(), prefixColor(prefix)].filter(Boolean).join(" ")} ${levelColor(displayMessage)}`;
}
function writeConsoleLine(level, line) {
	clearActiveProgressLine();
	const sanitized = process.platform === "win32" && process.env.GITHUB_ACTIONS === "true" ? line.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, "?").replace(/[\uD800-\uDFFF]/g, "?") : line;
	const sink = loggingState.rawConsole ?? console;
	if (loggingState.forceConsoleToStderr || level === "error" || level === "fatal") (sink.error ?? console.error)(sanitized);
	else if (level === "warn") (sink.warn ?? console.warn)(sanitized);
	else (sink.log ?? console.log)(sanitized);
}
function logToFile(fileLogger, level, message, meta) {
	if (level === "silent") return;
	const method = fileLogger[level];
	if (typeof method !== "function") return;
	if (meta && Object.keys(meta).length > 0) method.call(fileLogger, meta, message);
	else method.call(fileLogger, message);
}
function createSubsystemLogger(subsystem) {
	let fileLogger = null;
	const getFileLogger = () => {
		if (!fileLogger) fileLogger = getChildLogger({ subsystem });
		return fileLogger;
	};
	const emit = (level, message, meta) => {
		const consoleSettings = getConsoleSettings();
		let consoleMessageOverride;
		let fileMeta = meta;
		if (meta && Object.keys(meta).length > 0) {
			const { consoleMessage, ...rest } = meta;
			if (typeof consoleMessage === "string") consoleMessageOverride = consoleMessage;
			fileMeta = Object.keys(rest).length > 0 ? rest : void 0;
		}
		logToFile(getFileLogger(), level, message, fileMeta);
		if (!shouldLogToConsole(level, { level: consoleSettings.level })) return;
		if (!shouldLogSubsystemToConsole(subsystem)) return;
		const consoleMessage = consoleMessageOverride ?? message;
		if (!isVerbose() && subsystem === "agent/embedded" && /(sessionId|runId)=probe-/.test(consoleMessage)) return;
		writeConsoleLine(level, formatConsoleLine({
			level,
			subsystem,
			message: consoleSettings.style === "json" ? message : consoleMessage,
			style: consoleSettings.style,
			meta: fileMeta
		}));
	};
	return {
		subsystem,
		trace: (message, meta) => emit("trace", message, meta),
		debug: (message, meta) => emit("debug", message, meta),
		info: (message, meta) => emit("info", message, meta),
		warn: (message, meta) => emit("warn", message, meta),
		error: (message, meta) => emit("error", message, meta),
		fatal: (message, meta) => emit("fatal", message, meta),
		raw: (message) => {
			logToFile(getFileLogger(), "info", message, { raw: true });
			if (shouldLogSubsystemToConsole(subsystem)) {
				if (!isVerbose() && subsystem === "agent/embedded" && /(sessionId|runId)=probe-/.test(message)) return;
				writeConsoleLine("info", message);
			}
		},
		child: (name) => createSubsystemLogger(`${subsystem}/${name}`)
	};
}

//#endregion
//#region src/logger.ts
const subsystemPrefixRe = /^([a-z][a-z0-9-]{1,20}):\s+(.*)$/i;
function splitSubsystem(message) {
	const match = message.match(subsystemPrefixRe);
	if (!match) return null;
	const [, subsystem, rest] = match;
	return {
		subsystem,
		rest
	};
}
function logInfo(message, runtime = defaultRuntime) {
	const parsed = runtime === defaultRuntime ? splitSubsystem(message) : null;
	if (parsed) {
		createSubsystemLogger(parsed.subsystem).info(parsed.rest);
		return;
	}
	runtime.log(info(message));
	getLogger().info(message);
}
function logWarn(message, runtime = defaultRuntime) {
	const parsed = runtime === defaultRuntime ? splitSubsystem(message) : null;
	if (parsed) {
		createSubsystemLogger(parsed.subsystem).warn(parsed.rest);
		return;
	}
	runtime.log(warn(message));
	getLogger().warn(message);
}
function logError(message, runtime = defaultRuntime) {
	const parsed = runtime === defaultRuntime ? splitSubsystem(message) : null;
	if (parsed) {
		createSubsystemLogger(parsed.subsystem).error(parsed.rest);
		return;
	}
	runtime.error(danger(message));
	getLogger().error(message);
}
function logDebug(message) {
	getLogger().debug(message);
	logVerboseConsole(message);
}

//#endregion
//#region src/process/spawn-utils.ts
const DEFAULT_RETRY_CODES = ["EBADF"];
function resolveCommandStdio(params) {
	return [
		params.hasInput ? "pipe" : params.preferInherit ? "inherit" : "pipe",
		"pipe",
		"pipe"
	];
}
function formatSpawnError(err) {
	if (!(err instanceof Error)) return String(err);
	const details = err;
	const parts = [];
	const message = err.message?.trim();
	if (message) parts.push(message);
	if (details.code && !message?.includes(details.code)) parts.push(details.code);
	if (details.syscall) parts.push(`syscall=${details.syscall}`);
	if (typeof details.errno === "number") parts.push(`errno=${details.errno}`);
	return parts.join(" ");
}
function shouldRetry(err, codes) {
	const code = err && typeof err === "object" && "code" in err ? String(err.code) : "";
	return code.length > 0 && codes.includes(code);
}
async function spawnAndWaitForSpawn(spawnImpl, argv, options) {
	const child = spawnImpl(argv[0], argv.slice(1), options);
	return await new Promise((resolve, reject) => {
		let settled = false;
		const cleanup = () => {
			child.removeListener("error", onError);
			child.removeListener("spawn", onSpawn);
		};
		const finishResolve = () => {
			if (settled) return;
			settled = true;
			cleanup();
			resolve(child);
		};
		const onError = (err) => {
			if (settled) return;
			settled = true;
			cleanup();
			reject(err);
		};
		const onSpawn = () => {
			finishResolve();
		};
		child.once("error", onError);
		child.once("spawn", onSpawn);
		process.nextTick(() => {
			if (typeof child.pid === "number") finishResolve();
		});
	});
}
async function spawnWithFallback(params) {
	const spawnImpl = params.spawnImpl ?? spawn;
	const retryCodes = params.retryCodes ?? DEFAULT_RETRY_CODES;
	const baseOptions = { ...params.options };
	const fallbacks = params.fallbacks ?? [];
	const attempts = [{ options: baseOptions }, ...fallbacks.map((fallback) => ({
		label: fallback.label,
		options: {
			...baseOptions,
			...fallback.options
		}
	}))];
	let lastError;
	for (let index = 0; index < attempts.length; index += 1) {
		const attempt = attempts[index];
		try {
			return {
				child: await spawnAndWaitForSpawn(spawnImpl, params.argv, attempt.options),
				usedFallback: index > 0,
				fallbackLabel: attempt.label
			};
		} catch (err) {
			lastError = err;
			const nextFallback = fallbacks[index];
			if (!nextFallback || !shouldRetry(err, retryCodes)) throw err;
			params.onFallback?.(err, nextFallback);
		}
	}
	throw lastError;
}

//#endregion
//#region src/process/exec.ts
const execFileAsync = promisify(execFile);
/**
* Resolves a command for Windows compatibility.
* On Windows, non-.exe commands (like npm, pnpm) require their .cmd extension.
*/
function resolveCommand(command) {
	if (process.platform !== "win32") return command;
	const basename = path.basename(command).toLowerCase();
	if (path.extname(basename)) return command;
	if ([
		"npm",
		"pnpm",
		"yarn",
		"npx"
	].includes(basename)) return `${command}.cmd`;
	return command;
}
async function runExec(command, args, opts = 1e4) {
	const options = typeof opts === "number" ? {
		timeout: opts,
		encoding: "utf8"
	} : {
		timeout: opts.timeoutMs,
		maxBuffer: opts.maxBuffer,
		encoding: "utf8"
	};
	try {
		const { stdout, stderr } = await execFileAsync(resolveCommand(command), args, options);
		if (shouldLogVerbose()) {
			if (stdout.trim()) logDebug(stdout.trim());
			if (stderr.trim()) logError(stderr.trim());
		}
		return {
			stdout,
			stderr
		};
	} catch (err) {
		if (shouldLogVerbose()) logError(danger(`Command failed: ${command} ${args.join(" ")}`));
		throw err;
	}
}
async function runCommandWithTimeout(argv, optionsOrTimeout) {
	const options = typeof optionsOrTimeout === "number" ? { timeoutMs: optionsOrTimeout } : optionsOrTimeout;
	const { timeoutMs, cwd, input, env } = options;
	const { windowsVerbatimArguments } = options;
	const hasInput = input !== void 0;
	const shouldSuppressNpmFund = (() => {
		const cmd = path.basename(argv[0] ?? "");
		if (cmd === "npm" || cmd === "npm.cmd" || cmd === "npm.exe") return true;
		if (cmd === "node" || cmd === "node.exe") return (argv[1] ?? "").includes("npm-cli.js");
		return false;
	})();
	const resolvedEnv = env ? {
		...process.env,
		...env
	} : { ...process.env };
	if (shouldSuppressNpmFund) {
		if (resolvedEnv.NPM_CONFIG_FUND == null) resolvedEnv.NPM_CONFIG_FUND = "false";
		if (resolvedEnv.npm_config_fund == null) resolvedEnv.npm_config_fund = "false";
	}
	const stdio = resolveCommandStdio({
		hasInput,
		preferInherit: true
	});
	const child = spawn(resolveCommand(argv[0]), argv.slice(1), {
		stdio,
		cwd,
		env: resolvedEnv,
		windowsVerbatimArguments
	});
	return await new Promise((resolve, reject) => {
		let stdout = "";
		let stderr = "";
		let settled = false;
		const timer = setTimeout(() => {
			if (typeof child.kill === "function") child.kill("SIGKILL");
		}, timeoutMs);
		if (hasInput && child.stdin) {
			child.stdin.write(input ?? "");
			child.stdin.end();
		}
		child.stdout?.on("data", (d) => {
			stdout += d.toString();
		});
		child.stderr?.on("data", (d) => {
			stderr += d.toString();
		});
		child.on("error", (err) => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			reject(err);
		});
		child.on("close", (code, signal) => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			resolve({
				stdout,
				stderr,
				code,
				signal,
				killed: child.killed
			});
		});
	});
}

//#endregion
export { setActivePluginRegistry as C, requireActivePluginRegistry as S, getChatChannelMeta as _, logDebug as a, normalizeChatChannelId as b, logWarn as c, clearActiveProgressLine as d, registerActiveProgressLine as f, DEFAULT_CHAT_CHANNEL as g, CHAT_CHANNEL_ORDER as h, spawnWithFallback as i, createSubsystemLogger as l, CHANNEL_IDS as m, runExec as n, logError as o, unregisterActiveProgressLine as p, formatSpawnError as r, logInfo as s, runCommandWithTimeout as t, defaultRuntime as u, normalizeAnyChannelId as v, getActivePluginRegistry as x, normalizeChannelId as y };