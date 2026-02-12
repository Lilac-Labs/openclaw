import { C as setVerbose, O as isRich, k as theme, n as isTruthyEnvValue, p as defaultRuntime } from "./entry.js";
import "./auth-profiles-BZAsA3O9.js";
import { n as replaceCliName, r as resolveCliName } from "./command-format-ayFsmwwz.js";
import "./utils-Dk86IbEs.js";
import "./exec-B8JKbXKW.js";
import "./agent-scope-D3me2AZa.js";
import "./github-copilot-token-SLWintYd.js";
import "./pi-model-discovery-DzEIEgHL.js";
import { M as VERSION } from "./config-B492mw06.js";
import "./manifest-registry-D5SiA3xq.js";
import "./server-context-fX4xiYRh.js";
import "./chrome-yIKmOzCO.js";
import "./control-service-BqATf0h7.js";
import "./tailscale-DU6DgqVy.js";
import "./auth-BcNHFK-i.js";
import "./client-DMloFP_O.js";
import "./call-DLO1BEhA.js";
import "./message-channel-BlgPSDAh.js";
import { t as formatDocsLink } from "./links-7M-j83As.js";
import "./plugin-auto-enable-Dv9th7OE.js";
import "./plugins-B7F0Ly9G.js";
import "./logging-CfEk_PnX.js";
import "./accounts-DbzMEfKN.js";
import "./loader-DJRotWxM.js";
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
import { n as resolveCliChannelOptions } from "./channel-options-DVIYixhm.js";
import { a as getCommandPath, d as hasHelpOrVersion, l as getVerboseFlag } from "./register.subclis-aBjcOGqz.js";
import "./completion-cli-CPZ1_3km.js";
import "./gateway-rpc-ANWuGRVb.js";
import "./deps-CJdvY4AA.js";
import "./daemon-runtime-BcoVPWAL.js";
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
import { t as forceFreePort } from "./ports-BeebfNCb.js";
import "./auth-health-Bi7-jyzZ.js";
import { i as hasEmittedCliBanner, n as emitCliBanner, o as registerProgramCommands, r as formatCliBannerLine, t as ensureConfigReady } from "./config-guard-Dm5svCx-.js";
import "./help-format-CUnac_bT.js";
import "./configure-BavDCARX.js";
import "./systemd-linger-CDo2UbHM.js";
import "./doctor-C-KzBhfI.js";
import { Command } from "commander";

//#region src/cli/program/context.ts
function createProgramContext() {
	const channelOptions = resolveCliChannelOptions();
	return {
		programVersion: VERSION,
		channelOptions,
		messageChannelOptions: channelOptions.join("|"),
		agentChannelOptions: ["last", ...channelOptions].join("|")
	};
}

//#endregion
//#region src/cli/program/help.ts
const CLI_NAME = resolveCliName();
const EXAMPLES = [
	["openclaw channels login --verbose", "Link personal WhatsApp Web and show QR + connection logs."],
	["openclaw message send --target +15555550123 --message \"Hi\" --json", "Send via your web session and print JSON result."],
	["openclaw gateway --port 18789", "Run the WebSocket Gateway locally."],
	["openclaw --dev gateway", "Run a dev Gateway (isolated state/config) on ws://127.0.0.1:19001."],
	["openclaw gateway --force", "Kill anything bound to the default gateway port, then start it."],
	["openclaw gateway ...", "Gateway control via WebSocket."],
	["openclaw agent --to +15555550123 --message \"Run summary\" --deliver", "Talk directly to the agent using the Gateway; optionally send the WhatsApp reply."],
	["openclaw message send --channel telegram --target @mychat --message \"Hi\"", "Send via your Telegram bot."]
];
function configureProgramHelp(program, ctx) {
	program.name(CLI_NAME).description("").version(ctx.programVersion).option("--dev", "Dev profile: isolate state under ~/.openclaw-dev, default gateway port 19001, and shift derived ports (browser/canvas)").option("--profile <name>", "Use a named profile (isolates OPENCLAW_STATE_DIR/OPENCLAW_CONFIG_PATH under ~/.openclaw-<name>)");
	program.option("--no-color", "Disable ANSI colors", false);
	program.configureHelp({
		sortSubcommands: true,
		sortOptions: true,
		optionTerm: (option) => theme.option(option.flags),
		subcommandTerm: (cmd) => theme.command(cmd.name())
	});
	program.configureOutput({
		writeOut: (str) => {
			const colored = str.replace(/^Usage:/gm, theme.heading("Usage:")).replace(/^Options:/gm, theme.heading("Options:")).replace(/^Commands:/gm, theme.heading("Commands:"));
			process.stdout.write(colored);
		},
		writeErr: (str) => process.stderr.write(str),
		outputError: (str, write) => write(theme.error(str))
	});
	if (process.argv.includes("-V") || process.argv.includes("--version") || process.argv.includes("-v")) {
		console.log(ctx.programVersion);
		process.exit(0);
	}
	program.addHelpText("beforeAll", () => {
		if (hasEmittedCliBanner()) return "";
		const rich = isRich();
		return `\n${formatCliBannerLine(ctx.programVersion, { richTty: rich })}\n`;
	});
	const fmtExamples = EXAMPLES.map(([cmd, desc]) => `  ${theme.command(replaceCliName(cmd, CLI_NAME))}\n    ${theme.muted(desc)}`).join("\n");
	program.addHelpText("afterAll", ({ command }) => {
		if (command !== program) return "";
		const docs = formatDocsLink("/cli", "docs.openclaw.ai/cli");
		return `\n${theme.heading("Examples:")}\n${fmtExamples}\n\n${theme.muted("Docs:")} ${docs}\n`;
	});
}

//#endregion
//#region src/cli/program/preaction.ts
function setProcessTitleForCommand(actionCommand) {
	let current = actionCommand;
	while (current.parent && current.parent.parent) current = current.parent;
	const name = current.name();
	const cliName = resolveCliName();
	if (!name || name === cliName) return;
	process.title = `${cliName}-${name}`;
}
const PLUGIN_REQUIRED_COMMANDS = new Set([
	"message",
	"channels",
	"directory"
]);
function registerPreActionHooks(program, programVersion) {
	program.hook("preAction", async (_thisCommand, actionCommand) => {
		setProcessTitleForCommand(actionCommand);
		const argv = process.argv;
		if (hasHelpOrVersion(argv)) return;
		const commandPath = getCommandPath(argv, 2);
		if (!(isTruthyEnvValue(process.env.OPENCLAW_HIDE_BANNER) || commandPath[0] === "update" || commandPath[0] === "completion" || commandPath[0] === "plugins" && commandPath[1] === "update")) emitCliBanner(programVersion);
		const verbose = getVerboseFlag(argv, { includeDebug: true });
		setVerbose(verbose);
		if (!verbose) process.env.NODE_NO_WARNINGS ??= "1";
		if (commandPath[0] === "doctor" || commandPath[0] === "completion") return;
		await ensureConfigReady({
			runtime: defaultRuntime,
			commandPath
		});
		if (PLUGIN_REQUIRED_COMMANDS.has(commandPath[0])) ensurePluginRegistryLoaded();
	});
}

//#endregion
//#region src/cli/program/build-program.ts
function buildProgram() {
	const program = new Command();
	const ctx = createProgramContext();
	const argv = process.argv;
	configureProgramHelp(program, ctx);
	registerPreActionHooks(program, ctx.programVersion);
	registerProgramCommands(program, ctx, argv);
	return program;
}

//#endregion
export { buildProgram };