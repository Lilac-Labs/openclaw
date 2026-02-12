import { m as CHAT_CHANNEL_ORDER, t as createSubsystemLogger } from "./subsystem-Bh1Y_6Uv.js";
import { ut as loadOpenClawPlugins } from "./reply-P_lTBhho.js";
import { c as resolveDefaultAgentId, s as resolveAgentWorkspaceDir } from "./agent-scope-bNHJh30H.js";
import { t as isTruthyEnvValue } from "./env-BxRc6wWv.js";
import { i as loadConfig } from "./config-CqX-XS_G.js";
import { n as listChannelPlugins } from "./plugins-CXDOnert.js";
import { i as listChannelPluginCatalogEntries } from "./plugin-auto-enable-CrONSZDi.js";

//#region src/cli/command-options.ts
function hasExplicitOptions(command, names) {
	if (typeof command.getOptionValueSource !== "function") return false;
	return names.some((name) => command.getOptionValueSource(name) === "cli");
}

//#endregion
//#region src/cli/plugin-registry.ts
const log = createSubsystemLogger("plugins");
let pluginRegistryLoaded = false;
function ensurePluginRegistryLoaded() {
	if (pluginRegistryLoaded) return;
	const config = loadConfig();
	loadOpenClawPlugins({
		config,
		workspaceDir: resolveAgentWorkspaceDir(config, resolveDefaultAgentId(config)),
		logger: {
			info: (msg) => log.info(msg),
			warn: (msg) => log.warn(msg),
			error: (msg) => log.error(msg),
			debug: (msg) => log.debug(msg)
		}
	});
	pluginRegistryLoaded = true;
}

//#endregion
//#region src/cli/channel-options.ts
function dedupe(values) {
	const seen = /* @__PURE__ */ new Set();
	const resolved = [];
	for (const value of values) {
		if (!value || seen.has(value)) continue;
		seen.add(value);
		resolved.push(value);
	}
	return resolved;
}
function resolveCliChannelOptions() {
	const catalog = listChannelPluginCatalogEntries().map((entry) => entry.id);
	const base = dedupe([...CHAT_CHANNEL_ORDER, ...catalog]);
	if (isTruthyEnvValue(process.env.OPENCLAW_EAGER_CHANNEL_OPTIONS)) {
		ensurePluginRegistryLoaded();
		const pluginIds = listChannelPlugins().map((plugin) => plugin.id);
		return dedupe([...base, ...pluginIds]);
	}
	return base;
}
function formatCliChannelOptions(extra = []) {
	return [...extra, ...resolveCliChannelOptions()].join("|");
}

//#endregion
export { hasExplicitOptions as i, resolveCliChannelOptions as n, ensurePluginRegistryLoaded as r, formatCliChannelOptions as t };