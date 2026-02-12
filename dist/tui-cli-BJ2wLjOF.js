import { k as theme, p as defaultRuntime } from "./entry.js";
import "./auth-profiles-BZAsA3O9.js";
import "./utils-Dk86IbEs.js";
import "./exec-B8JKbXKW.js";
import "./agent-scope-D3me2AZa.js";
import "./github-copilot-token-SLWintYd.js";
import "./config-B492mw06.js";
import "./manifest-registry-D5SiA3xq.js";
import "./server-context-fX4xiYRh.js";
import "./chrome-yIKmOzCO.js";
import "./client-DMloFP_O.js";
import "./call-DLO1BEhA.js";
import "./message-channel-BlgPSDAh.js";
import { t as formatDocsLink } from "./links-7M-j83As.js";
import "./plugins-B7F0Ly9G.js";
import "./logging-CfEk_PnX.js";
import "./accounts-DbzMEfKN.js";
import "./paths-IivnSNkP.js";
import "./redact-DuEEf1p1.js";
import "./routes-D3kAaoo4.js";
import "./pi-embedded-helpers-Cx65Z-6e.js";
import "./sandbox-BLyWpgSU.js";
import "./tui-formatters-B2jSoYB2.js";
import "./skills-C_rNI0Jc.js";
import "./tool-display-o-dDAlqF.js";
import { t as parseTimeoutMs } from "./parse-timeout-DFSPLxpY.js";
import { t as runTui } from "./tui-Qf81nBVx.js";

//#region src/cli/tui-cli.ts
function registerTuiCli(program) {
	program.command("tui").description("Open a terminal UI connected to the Gateway").option("--url <url>", "Gateway WebSocket URL (defaults to gateway.remote.url when configured)").option("--token <token>", "Gateway token (if required)").option("--password <password>", "Gateway password (if required)").option("--session <key>", "Session key (default: \"main\", or \"global\" when scope is global)").option("--deliver", "Deliver assistant replies", false).option("--thinking <level>", "Thinking level override").option("--message <text>", "Send an initial message after connecting").option("--timeout-ms <ms>", "Agent timeout in ms (defaults to agents.defaults.timeoutSeconds)").option("--history-limit <n>", "History entries to load", "200").addHelpText("after", () => `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/tui", "docs.openclaw.ai/cli/tui")}\n`).action(async (opts) => {
		try {
			const timeoutMs = parseTimeoutMs(opts.timeoutMs);
			if (opts.timeoutMs !== void 0 && timeoutMs === void 0) defaultRuntime.error(`warning: invalid --timeout-ms "${String(opts.timeoutMs)}"; ignoring`);
			const historyLimit = Number.parseInt(String(opts.historyLimit ?? "200"), 10);
			await runTui({
				url: opts.url,
				token: opts.token,
				password: opts.password,
				session: opts.session,
				deliver: Boolean(opts.deliver),
				thinking: opts.thinking,
				message: opts.message,
				timeoutMs,
				historyLimit: Number.isNaN(historyLimit) ? void 0 : historyLimit
			});
		} catch (err) {
			defaultRuntime.error(String(err));
			defaultRuntime.exit(1);
		}
	});
}

//#endregion
export { registerTuiCli };