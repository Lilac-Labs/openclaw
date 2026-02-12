import { o as createSubsystemLogger } from "./entry.js";
import "./auth-profiles-BZAsA3O9.js";
import "./utils-Dk86IbEs.js";
import "./exec-B8JKbXKW.js";
import { c as resolveDefaultAgentId, s as resolveAgentWorkspaceDir } from "./agent-scope-D3me2AZa.js";
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
import "./plugins-B7F0Ly9G.js";
import "./logging-CfEk_PnX.js";
import "./accounts-DbzMEfKN.js";
import { t as loadOpenClawPlugins } from "./loader-DJRotWxM.js";
import "./progress-Da1ehW-x.js";
import "./prompt-style-Dc0C5HC9.js";
import "./manager-B0LyaXNG.js";
import "./paths-IivnSNkP.js";
import "./sqlite-B7FPASCO.js";
import "./redact-DuEEf1p1.js";
import "./routes-D3kAaoo4.js";
import "./pi-embedded-helpers-Cx65Z-6e.js";
import "./deliver-pFMP5UiT.js";
import "./sandbox-BLyWpgSU.js";
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