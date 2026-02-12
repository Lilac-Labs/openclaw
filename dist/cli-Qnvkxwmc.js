import "./paths-DVBShlw6.js";
import { t as createSubsystemLogger } from "./subsystem-Bh1Y_6Uv.js";
import "./utils-es4ygvQ-.js";
import "./pi-embedded-helpers-yEQRtLyw.js";
import { ut as loadOpenClawPlugins } from "./reply-P_lTBhho.js";
import "./exec-Cv_Ofd1m.js";
import { c as resolveDefaultAgentId, s as resolveAgentWorkspaceDir } from "./agent-scope-bNHJh30H.js";
import "./model-selection-0Mb0IXS7.js";
import "./github-copilot-token-BW-SEg7E.js";
import "./boolean-BgXe2hyu.js";
import "./env-BxRc6wWv.js";
import { i as loadConfig } from "./config-CqX-XS_G.js";
import "./manifest-registry-3It8Z8yN.js";
import "./plugins-CXDOnert.js";
import "./sandbox-BoauKXAW.js";
import "./image-BYkg7G5v.js";
import "./pi-model-discovery-CV2V1HHz.js";
import "./chrome-Dm-EgOjJ.js";
import "./skills-Bau1zXIA.js";
import "./routes-DA8ohR--.js";
import "./server-context-8Qt35QdF.js";
import "./message-channel-Cu61-7H6.js";
import "./logging-BzvBIA3Y.js";
import "./accounts-C2elk6PC.js";
import "./paths-Bkhd_qY8.js";
import "./redact-DAKeu7PA.js";
import "./tool-display-DskiU8Kt.js";
import "./deliver-5rp6-FOH.js";
import "./dispatcher-at6GAt0F.js";
import "./manager-DGt2N-CU.js";
import "./sqlite-Btrgi7-j.js";
import "./tui-formatters-C8AF9gV9.js";
import "./client-6xKrRC-1.js";
import "./call-p03PxzN2.js";
import "./login-qr-qI6i9mSe.js";
import "./pairing-store-C5bI2uOn.js";
import "./links-C591fM9M.js";
import "./progress-DIQJt9Va.js";
import "./pi-tools.policy-oA8oQEf2.js";
import "./prompt-style-CjQRlDx4.js";
import "./pairing-labels-C1gYNpBx.js";
import "./session-cost-usage-PvyVZz-g.js";
import "./control-service-td8TSXMO.js";
import "./channel-selection-DqqM1jFv.js";

//#region src/plugins/cli.ts
const log = createSubsystemLogger("plugins");
function registerPluginCliCommands(program, cfg) {
	const config = cfg ?? loadConfig();
	const workspaceDir = resolveAgentWorkspaceDir(config, resolveDefaultAgentId(config));
	const logger = {
		info: (msg) => log.info(msg),
		warn: (msg) => log.warn(msg),
		error: (msg) => log.error(msg),
		debug: (msg) => log.debug(msg)
	};
	const registry = loadOpenClawPlugins({
		config,
		workspaceDir,
		logger
	});
	const existingCommands = new Set(program.commands.map((cmd) => cmd.name()));
	for (const entry of registry.cliRegistrars) {
		if (entry.commands.length > 0) {
			const overlaps = entry.commands.filter((command) => existingCommands.has(command));
			if (overlaps.length > 0) {
				log.debug(`plugin CLI register skipped (${entry.pluginId}): command already registered (${overlaps.join(", ")})`);
				continue;
			}
		}
		try {
			const result = entry.register({
				program,
				config,
				workspaceDir,
				logger
			});
			if (result && typeof result.then === "function") result.catch((err) => {
				log.warn(`plugin CLI register failed (${entry.pluginId}): ${String(err)}`);
			});
			for (const command of entry.commands) existingCommands.add(command);
		} catch (err) {
			log.warn(`plugin CLI register failed (${entry.pluginId}): ${String(err)}`);
		}
	}
}

//#endregion
export { registerPluginCliCommands };