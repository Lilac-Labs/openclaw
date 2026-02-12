import { t as __exportAll } from "./rolldown-runtime-Cbj13DAv.js";
import { t as createSubsystemLogger } from "./subsystem-Bh1Y_6Uv.js";
import { i as loadConfig } from "./config-CqX-XS_G.js";
import { w as ensureChromeExtensionRelayServer } from "./chrome-Dm-EgOjJ.js";
import { a as resolveProfile, i as resolveBrowserConfig, t as createBrowserRouteContext } from "./server-context-8Qt35QdF.js";

//#region src/browser/control-service.ts
var control_service_exports = /* @__PURE__ */ __exportAll({
	createBrowserControlContext: () => createBrowserControlContext,
	getBrowserControlState: () => getBrowserControlState,
	startBrowserControlServiceFromConfig: () => startBrowserControlServiceFromConfig,
	stopBrowserControlService: () => stopBrowserControlService
});
let state = null;
const logService = createSubsystemLogger("browser").child("service");
function getBrowserControlState() {
	return state;
}
function createBrowserControlContext() {
	return createBrowserRouteContext({ getState: () => state });
}
async function startBrowserControlServiceFromConfig() {
	if (state) return state;
	const cfg = loadConfig();
	const resolved = resolveBrowserConfig(cfg.browser, cfg);
	if (!resolved.enabled) return null;
	state = {
		server: null,
		port: resolved.controlPort,
		resolved,
		profiles: /* @__PURE__ */ new Map()
	};
	for (const name of Object.keys(resolved.profiles)) {
		const profile = resolveProfile(resolved, name);
		if (!profile || profile.driver !== "extension") continue;
		await ensureChromeExtensionRelayServer({ cdpUrl: profile.cdpUrl }).catch((err) => {
			logService.warn(`Chrome extension relay init failed for profile "${name}": ${String(err)}`);
		});
	}
	logService.info(`Browser control service ready (profiles=${Object.keys(resolved.profiles).length})`);
	return state;
}
async function stopBrowserControlService() {
	const current = state;
	if (!current) return;
	const ctx = createBrowserRouteContext({ getState: () => state });
	try {
		for (const name of Object.keys(current.resolved.profiles)) try {
			await ctx.forProfile(name).stopRunningBrowser();
		} catch {}
	} catch (err) {
		logService.warn(`openclaw browser stop failed: ${String(err)}`);
	}
	state = null;
	try {
		await (await import("./pw-ai-COWYvUfG.js")).closePlaywrightBrowserConnection();
	} catch {}
}

//#endregion
export { createBrowserControlContext as n, startBrowserControlServiceFromConfig as r, control_service_exports as t };