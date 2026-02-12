import { c as enableConsoleCapture, i as normalizeEnv, n as isTruthyEnvValue, p as defaultRuntime } from "./entry.js";
import "./auth-profiles-BZAsA3O9.js";
import "./utils-Dk86IbEs.js";
import "./exec-B8JKbXKW.js";
import "./agent-scope-D3me2AZa.js";
import "./github-copilot-token-SLWintYd.js";
import "./pi-model-discovery-DzEIEgHL.js";
import { M as VERSION, N as loadDotEnv } from "./config-B492mw06.js";
import "./manifest-registry-D5SiA3xq.js";
import "./server-context-fX4xiYRh.js";
import "./chrome-yIKmOzCO.js";
import { r as formatUncaughtError } from "./errors-x4NYs-1P.js";
import "./control-service-BqATf0h7.js";
import { t as ensureOpenClawCliOnPath } from "./path-env-CXWUFfFv.js";
import "./tailscale-DU6DgqVy.js";
import "./auth-BcNHFK-i.js";
import "./client-DMloFP_O.js";
import "./call-DLO1BEhA.js";
import "./message-channel-BlgPSDAh.js";
import "./links-7M-j83As.js";
import "./plugin-auto-enable-Dv9th7OE.js";
import "./plugins-B7F0Ly9G.js";
import "./logging-CfEk_PnX.js";
import "./accounts-DbzMEfKN.js";
import { Pt as installUnhandledRejectionHandler } from "./loader-DJRotWxM.js";
import "./progress-Da1ehW-x.js";
import "./prompt-style-Dc0C5HC9.js";
import "./note-Ci08TSbV.js";
import "./clack-prompter-DuBVnTKy.js";
import "./onboard-channels-BJpLgPa5.js";
import "./archive-D0z3LZDK.js";
import "./skill-scanner-C_fQzVDu.js";
import "./installs-k_OWy87z.js";
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
import "./channels-status-issues-DFhI_u0p.js";
import { n as ensurePluginRegistryLoaded } from "./command-options-1Oati29A.js";
import { a as getCommandPath, c as getPrimaryCommand, d as hasHelpOrVersion } from "./register.subclis-aBjcOGqz.js";
import "./completion-cli-CPZ1_3km.js";
import "./gateway-rpc-ANWuGRVb.js";
import "./deps-CJdvY4AA.js";
import { h as assertSupportedRuntime } from "./daemon-runtime-BcoVPWAL.js";
import "./service-DDPRbf8a.js";
import "./systemd-BEWwfwn0.js";
import "./service-audit-BGCzyg1J.js";
import "./table-cCoGqLsk.js";
import "./widearea-dns-CMIG6-74.js";
import "./audit-DVQeBKlt.js";
import "./onboard-skills-B81nfPnJ.js";
import "./health-format-Cr5lMMdM.js";
import "./update-runner-3YIbaMs5.js";
import "./github-copilot-auth-Cu08j7QM.js";
import "./logging-DuK6YXuK.js";
import "./hooks-status-BrIvQK2p.js";
import "./status-BgryRZ0n.js";
import "./skills-status-CJMt5NLm.js";
import "./tui-Qf81nBVx.js";
import "./agent-BbREE1w4.js";
import "./node-service-u8g85nD3.js";
import "./auth-health-Bi7-jyzZ.js";
import { a as findRoutedCommand, n as emitCliBanner, t as ensureConfigReady } from "./config-guard-Dm5svCx-.js";
import "./help-format-CUnac_bT.js";
import "./configure-BavDCARX.js";
import "./systemd-linger-CDo2UbHM.js";
import "./doctor-C-KzBhfI.js";
import path from "node:path";
import process$1 from "node:process";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

//#region src/cli/route.ts
async function prepareRoutedCommand(params) {
	emitCliBanner(VERSION, { argv: params.argv });
	await ensureConfigReady({
		runtime: defaultRuntime,
		commandPath: params.commandPath
	});
	if (params.loadPlugins) ensurePluginRegistryLoaded();
}
async function tryRouteCli(argv) {
	if (isTruthyEnvValue(process.env.OPENCLAW_DISABLE_ROUTE_FIRST)) return false;
	if (hasHelpOrVersion(argv)) return false;
	const path = getCommandPath(argv, 2);
	if (!path[0]) return false;
	const route = findRoutedCommand(path);
	if (!route) return false;
	await prepareRoutedCommand({
		argv,
		commandPath: path,
		loadPlugins: route.loadPlugins
	});
	return route.run(argv);
}

//#endregion
//#region src/cli/run-main.ts
function rewriteUpdateFlagArgv(argv) {
	const index = argv.indexOf("--update");
	if (index === -1) return argv;
	const next = [...argv];
	next.splice(index, 1, "update");
	return next;
}
async function runCli(argv = process$1.argv) {
	const normalizedArgv = stripWindowsNodeExec(argv);
	loadDotEnv({ quiet: true });
	normalizeEnv();
	ensureOpenClawCliOnPath();
	assertSupportedRuntime();
	if (await tryRouteCli(normalizedArgv)) return;
	enableConsoleCapture();
	const { buildProgram } = await import("./program-BlX9hQtX.js");
	const program = buildProgram();
	installUnhandledRejectionHandler();
	process$1.on("uncaughtException", (error) => {
		console.error("[openclaw] Uncaught exception:", formatUncaughtError(error));
		process$1.exit(1);
	});
	const parseArgv = rewriteUpdateFlagArgv(normalizedArgv);
	const primary = getPrimaryCommand(parseArgv);
	if (primary) {
		const { registerSubCliByName } = await import("./register.subclis-aBjcOGqz.js").then((n) => n.i);
		await registerSubCliByName(program, primary);
	}
	if (!(!primary && hasHelpOrVersion(parseArgv))) {
		const { registerPluginCliCommands } = await import("./cli-DEKCbUSo.js");
		const { loadConfig } = await import("./config-B492mw06.js").then((n) => n.t);
		registerPluginCliCommands(program, loadConfig());
	}
	await program.parseAsync(parseArgv);
}
function stripWindowsNodeExec(argv) {
	if (process$1.platform !== "win32") return argv;
	const stripControlChars = (value) => {
		let out = "";
		for (let i = 0; i < value.length; i += 1) {
			const code = value.charCodeAt(i);
			if (code >= 32 && code !== 127) out += value[i];
		}
		return out;
	};
	const normalizeArg = (value) => stripControlChars(value).replace(/^['"]+|['"]+$/g, "").trim();
	const normalizeCandidate = (value) => normalizeArg(value).replace(/^\\\\\\?\\/, "");
	const execPath = normalizeCandidate(process$1.execPath);
	const execPathLower = execPath.toLowerCase();
	const execBase = path.basename(execPath).toLowerCase();
	const isExecPath = (value) => {
		if (!value) return false;
		const normalized = normalizeCandidate(value);
		if (!normalized) return false;
		const lower = normalized.toLowerCase();
		return lower === execPathLower || path.basename(lower) === execBase || lower.endsWith("\\node.exe") || lower.endsWith("/node.exe") || lower.includes("node.exe") || path.basename(lower) === "node.exe" && fs.existsSync(normalized);
	};
	const filtered = argv.filter((arg, index) => index === 0 || !isExecPath(arg));
	if (filtered.length < 3) return filtered;
	const cleaned = [...filtered];
	if (isExecPath(cleaned[1])) cleaned.splice(1, 1);
	if (isExecPath(cleaned[2])) cleaned.splice(2, 1);
	return cleaned;
}

//#endregion
export { runCli };