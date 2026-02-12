import "./paths-DVBShlw6.js";
import { R as theme, c as defaultRuntime } from "./subsystem-Bh1Y_6Uv.js";
import { C as shortenHomePath, S as shortenHomeInString, _ as resolveConfigDir, b as resolveUserPath } from "./utils-es4ygvQ-.js";
import "./pi-embedded-helpers-yEQRtLyw.js";
import "./reply-P_lTBhho.js";
import "./exec-Cv_Ofd1m.js";
import "./agent-scope-bNHJh30H.js";
import "./model-selection-0Mb0IXS7.js";
import "./github-copilot-token-BW-SEg7E.js";
import "./boolean-BgXe2hyu.js";
import "./env-BxRc6wWv.js";
import { c as writeConfigFile, i as loadConfig } from "./config-CqX-XS_G.js";
import { d as applyExclusiveSlotSelection, o as resolveBundledPluginsDir } from "./manifest-registry-3It8Z8yN.js";
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
import { t as formatDocsLink } from "./links-C591fM9M.js";
import "./progress-DIQJt9Va.js";
import "./pi-tools.policy-oA8oQEf2.js";
import "./prompt-style-CjQRlDx4.js";
import "./pairing-labels-C1gYNpBx.js";
import "./session-cost-usage-PvyVZz-g.js";
import "./control-service-td8TSXMO.js";
import "./channel-selection-DqqM1jFv.js";
import { i as resolveArchiveKind } from "./archive-CXhvR9nU.js";
import "./skill-scanner-DrVEHfC6.js";
import { n as installPluginFromNpmSpec, r as installPluginFromPath, t as recordPluginInstall } from "./installs-DYrEcixp.js";
import { t as renderTable } from "./table-DEnmtvl5.js";
import { t as buildPluginStatusReport } from "./status-BzmpyngC.js";
import { n as updateNpmInstalledPlugins } from "./update-TdHTCzhr.js";
import fs from "node:fs";
import path from "node:path";

//#region src/plugins/source-display.ts
function tryRelative(root, filePath) {
	const rel = path.relative(root, filePath);
	if (!rel || rel === ".") return null;
	if (rel === "..") return null;
	if (rel.startsWith(`..${path.sep}`) || rel.startsWith("../") || rel.startsWith("..\\")) return null;
	if (path.isAbsolute(rel)) return null;
	return rel.replaceAll("\\", "/");
}
function resolvePluginSourceRoots(params) {
	return {
		stock: resolveBundledPluginsDir(),
		global: path.join(resolveConfigDir(), "extensions"),
		workspace: params.workspaceDir ? path.join(params.workspaceDir, ".openclaw", "extensions") : void 0
	};
}
function formatPluginSourceForTable(plugin, roots) {
	const raw = plugin.source;
	if (plugin.origin === "bundled" && roots.stock) {
		const rel = tryRelative(roots.stock, raw);
		if (rel) return {
			value: `stock:${rel}`,
			rootKey: "stock"
		};
	}
	if (plugin.origin === "workspace" && roots.workspace) {
		const rel = tryRelative(roots.workspace, raw);
		if (rel) return {
			value: `workspace:${rel}`,
			rootKey: "workspace"
		};
	}
	if (plugin.origin === "global" && roots.global) {
		const rel = tryRelative(roots.global, raw);
		if (rel) return {
			value: `global:${rel}`,
			rootKey: "global"
		};
	}
	return { value: shortenHomeInString(raw) };
}

//#endregion
//#region src/cli/plugins-cli.ts
function formatPluginLine(plugin, verbose = false) {
	const status = plugin.status === "loaded" ? theme.success("loaded") : plugin.status === "disabled" ? theme.warn("disabled") : theme.error("error");
	const name = theme.command(plugin.name || plugin.id);
	const idSuffix = plugin.name && plugin.name !== plugin.id ? theme.muted(` (${plugin.id})`) : "";
	const desc = plugin.description ? theme.muted(plugin.description.length > 60 ? `${plugin.description.slice(0, 57)}...` : plugin.description) : theme.muted("(no description)");
	if (!verbose) return `${name}${idSuffix} ${status} - ${desc}`;
	const parts = [
		`${name}${idSuffix} ${status}`,
		`  source: ${theme.muted(shortenHomeInString(plugin.source))}`,
		`  origin: ${plugin.origin}`
	];
	if (plugin.version) parts.push(`  version: ${plugin.version}`);
	if (plugin.providerIds.length > 0) parts.push(`  providers: ${plugin.providerIds.join(", ")}`);
	if (plugin.error) parts.push(theme.error(`  error: ${plugin.error}`));
	return parts.join("\n");
}
function applySlotSelectionForPlugin(config, pluginId) {
	const report = buildPluginStatusReport({ config });
	const plugin = report.plugins.find((entry) => entry.id === pluginId);
	if (!plugin) return {
		config,
		warnings: []
	};
	const result = applyExclusiveSlotSelection({
		config,
		selectedId: plugin.id,
		selectedKind: plugin.kind,
		registry: report
	});
	return {
		config: result.config,
		warnings: result.warnings
	};
}
function logSlotWarnings(warnings) {
	if (warnings.length === 0) return;
	for (const warning of warnings) defaultRuntime.log(theme.warn(warning));
}
function registerPluginsCli(program) {
	const plugins = program.command("plugins").description("Manage OpenClaw plugins/extensions").addHelpText("after", () => `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/plugins", "docs.openclaw.ai/cli/plugins")}\n`);
	plugins.command("list").description("List discovered plugins").option("--json", "Print JSON").option("--enabled", "Only show enabled plugins", false).option("--verbose", "Show detailed entries", false).action((opts) => {
		const report = buildPluginStatusReport();
		const list = opts.enabled ? report.plugins.filter((p) => p.status === "loaded") : report.plugins;
		if (opts.json) {
			const payload = {
				workspaceDir: report.workspaceDir,
				plugins: list,
				diagnostics: report.diagnostics
			};
			defaultRuntime.log(JSON.stringify(payload, null, 2));
			return;
		}
		if (list.length === 0) {
			defaultRuntime.log(theme.muted("No plugins found."));
			return;
		}
		const loaded = list.filter((p) => p.status === "loaded").length;
		defaultRuntime.log(`${theme.heading("Plugins")} ${theme.muted(`(${loaded}/${list.length} loaded)`)}`);
		if (!opts.verbose) {
			const tableWidth = Math.max(60, (process.stdout.columns ?? 120) - 1);
			const sourceRoots = resolvePluginSourceRoots({ workspaceDir: report.workspaceDir });
			const usedRoots = /* @__PURE__ */ new Set();
			const rows = list.map((plugin) => {
				const desc = plugin.description ? theme.muted(plugin.description) : "";
				const formattedSource = formatPluginSourceForTable(plugin, sourceRoots);
				if (formattedSource.rootKey) usedRoots.add(formattedSource.rootKey);
				const sourceLine = desc ? `${formattedSource.value}\n${desc}` : formattedSource.value;
				return {
					Name: plugin.name || plugin.id,
					ID: plugin.name && plugin.name !== plugin.id ? plugin.id : "",
					Status: plugin.status === "loaded" ? theme.success("loaded") : plugin.status === "disabled" ? theme.warn("disabled") : theme.error("error"),
					Source: sourceLine,
					Version: plugin.version ?? ""
				};
			});
			if (usedRoots.size > 0) {
				defaultRuntime.log(theme.muted("Source roots:"));
				for (const key of [
					"stock",
					"workspace",
					"global"
				]) {
					if (!usedRoots.has(key)) continue;
					const dir = sourceRoots[key];
					if (!dir) continue;
					defaultRuntime.log(`  ${theme.command(`${key}:`)} ${theme.muted(dir)}`);
				}
				defaultRuntime.log("");
			}
			defaultRuntime.log(renderTable({
				width: tableWidth,
				columns: [
					{
						key: "Name",
						header: "Name",
						minWidth: 14,
						flex: true
					},
					{
						key: "ID",
						header: "ID",
						minWidth: 10,
						flex: true
					},
					{
						key: "Status",
						header: "Status",
						minWidth: 10
					},
					{
						key: "Source",
						header: "Source",
						minWidth: 26,
						flex: true
					},
					{
						key: "Version",
						header: "Version",
						minWidth: 8
					}
				],
				rows
			}).trimEnd());
			return;
		}
		const lines = [];
		for (const plugin of list) {
			lines.push(formatPluginLine(plugin, true));
			lines.push("");
		}
		defaultRuntime.log(lines.join("\n").trim());
	});
	plugins.command("info").description("Show plugin details").argument("<id>", "Plugin id").option("--json", "Print JSON").action((id, opts) => {
		const plugin = buildPluginStatusReport().plugins.find((p) => p.id === id || p.name === id);
		if (!plugin) {
			defaultRuntime.error(`Plugin not found: ${id}`);
			process.exit(1);
		}
		const install = loadConfig().plugins?.installs?.[plugin.id];
		if (opts.json) {
			defaultRuntime.log(JSON.stringify(plugin, null, 2));
			return;
		}
		const lines = [];
		lines.push(theme.heading(plugin.name || plugin.id));
		if (plugin.name && plugin.name !== plugin.id) lines.push(theme.muted(`id: ${plugin.id}`));
		if (plugin.description) lines.push(plugin.description);
		lines.push("");
		lines.push(`${theme.muted("Status:")} ${plugin.status}`);
		lines.push(`${theme.muted("Source:")} ${shortenHomeInString(plugin.source)}`);
		lines.push(`${theme.muted("Origin:")} ${plugin.origin}`);
		if (plugin.version) lines.push(`${theme.muted("Version:")} ${plugin.version}`);
		if (plugin.toolNames.length > 0) lines.push(`${theme.muted("Tools:")} ${plugin.toolNames.join(", ")}`);
		if (plugin.hookNames.length > 0) lines.push(`${theme.muted("Hooks:")} ${plugin.hookNames.join(", ")}`);
		if (plugin.gatewayMethods.length > 0) lines.push(`${theme.muted("Gateway methods:")} ${plugin.gatewayMethods.join(", ")}`);
		if (plugin.providerIds.length > 0) lines.push(`${theme.muted("Providers:")} ${plugin.providerIds.join(", ")}`);
		if (plugin.cliCommands.length > 0) lines.push(`${theme.muted("CLI commands:")} ${plugin.cliCommands.join(", ")}`);
		if (plugin.services.length > 0) lines.push(`${theme.muted("Services:")} ${plugin.services.join(", ")}`);
		if (plugin.error) lines.push(`${theme.error("Error:")} ${plugin.error}`);
		if (install) {
			lines.push("");
			lines.push(`${theme.muted("Install:")} ${install.source}`);
			if (install.spec) lines.push(`${theme.muted("Spec:")} ${install.spec}`);
			if (install.sourcePath) lines.push(`${theme.muted("Source path:")} ${shortenHomePath(install.sourcePath)}`);
			if (install.installPath) lines.push(`${theme.muted("Install path:")} ${shortenHomePath(install.installPath)}`);
			if (install.version) lines.push(`${theme.muted("Recorded version:")} ${install.version}`);
			if (install.installedAt) lines.push(`${theme.muted("Installed at:")} ${install.installedAt}`);
		}
		defaultRuntime.log(lines.join("\n"));
	});
	plugins.command("enable").description("Enable a plugin in config").argument("<id>", "Plugin id").action(async (id) => {
		const cfg = loadConfig();
		let next = {
			...cfg,
			plugins: {
				...cfg.plugins,
				entries: {
					...cfg.plugins?.entries,
					[id]: {
						...(cfg.plugins?.entries)?.[id],
						enabled: true
					}
				}
			}
		};
		const slotResult = applySlotSelectionForPlugin(next, id);
		next = slotResult.config;
		await writeConfigFile(next);
		logSlotWarnings(slotResult.warnings);
		defaultRuntime.log(`Enabled plugin "${id}". Restart the gateway to apply.`);
	});
	plugins.command("disable").description("Disable a plugin in config").argument("<id>", "Plugin id").action(async (id) => {
		const cfg = loadConfig();
		await writeConfigFile({
			...cfg,
			plugins: {
				...cfg.plugins,
				entries: {
					...cfg.plugins?.entries,
					[id]: {
						...(cfg.plugins?.entries)?.[id],
						enabled: false
					}
				}
			}
		});
		defaultRuntime.log(`Disabled plugin "${id}". Restart the gateway to apply.`);
	});
	plugins.command("install").description("Install a plugin (path, archive, or npm spec)").argument("<path-or-spec>", "Path (.ts/.js/.zip/.tgz/.tar.gz) or an npm package spec").option("-l, --link", "Link a local path instead of copying", false).action(async (raw, opts) => {
		const resolved = resolveUserPath(raw);
		const cfg = loadConfig();
		if (fs.existsSync(resolved)) {
			if (opts.link) {
				const existing = cfg.plugins?.load?.paths ?? [];
				const merged = Array.from(new Set([...existing, resolved]));
				const probe = await installPluginFromPath({
					path: resolved,
					dryRun: true
				});
				if (!probe.ok) {
					defaultRuntime.error(probe.error);
					process.exit(1);
				}
				let next = {
					...cfg,
					plugins: {
						...cfg.plugins,
						load: {
							...cfg.plugins?.load,
							paths: merged
						},
						entries: {
							...cfg.plugins?.entries,
							[probe.pluginId]: {
								...cfg.plugins?.entries?.[probe.pluginId],
								enabled: true
							}
						}
					}
				};
				next = recordPluginInstall(next, {
					pluginId: probe.pluginId,
					source: "path",
					sourcePath: resolved,
					installPath: resolved,
					version: probe.version
				});
				const slotResult = applySlotSelectionForPlugin(next, probe.pluginId);
				next = slotResult.config;
				await writeConfigFile(next);
				logSlotWarnings(slotResult.warnings);
				defaultRuntime.log(`Linked plugin path: ${shortenHomePath(resolved)}`);
				defaultRuntime.log(`Restart the gateway to load plugins.`);
				return;
			}
			const result = await installPluginFromPath({
				path: resolved,
				logger: {
					info: (msg) => defaultRuntime.log(msg),
					warn: (msg) => defaultRuntime.log(theme.warn(msg))
				}
			});
			if (!result.ok) {
				defaultRuntime.error(result.error);
				process.exit(1);
			}
			let next = {
				...cfg,
				plugins: {
					...cfg.plugins,
					entries: {
						...cfg.plugins?.entries,
						[result.pluginId]: {
							...cfg.plugins?.entries?.[result.pluginId],
							enabled: true
						}
					}
				}
			};
			const source = resolveArchiveKind(resolved) ? "archive" : "path";
			next = recordPluginInstall(next, {
				pluginId: result.pluginId,
				source,
				sourcePath: resolved,
				installPath: result.targetDir,
				version: result.version
			});
			const slotResult = applySlotSelectionForPlugin(next, result.pluginId);
			next = slotResult.config;
			await writeConfigFile(next);
			logSlotWarnings(slotResult.warnings);
			defaultRuntime.log(`Installed plugin: ${result.pluginId}`);
			defaultRuntime.log(`Restart the gateway to load plugins.`);
			return;
		}
		if (opts.link) {
			defaultRuntime.error("`--link` requires a local path.");
			process.exit(1);
		}
		if (raw.startsWith(".") || raw.startsWith("~") || path.isAbsolute(raw) || raw.endsWith(".ts") || raw.endsWith(".js") || raw.endsWith(".mjs") || raw.endsWith(".cjs") || raw.endsWith(".tgz") || raw.endsWith(".tar.gz") || raw.endsWith(".tar") || raw.endsWith(".zip")) {
			defaultRuntime.error(`Path not found: ${resolved}`);
			process.exit(1);
		}
		const result = await installPluginFromNpmSpec({
			spec: raw,
			logger: {
				info: (msg) => defaultRuntime.log(msg),
				warn: (msg) => defaultRuntime.log(theme.warn(msg))
			}
		});
		if (!result.ok) {
			defaultRuntime.error(result.error);
			process.exit(1);
		}
		let next = {
			...cfg,
			plugins: {
				...cfg.plugins,
				entries: {
					...cfg.plugins?.entries,
					[result.pluginId]: {
						...cfg.plugins?.entries?.[result.pluginId],
						enabled: true
					}
				}
			}
		};
		next = recordPluginInstall(next, {
			pluginId: result.pluginId,
			source: "npm",
			spec: raw,
			installPath: result.targetDir,
			version: result.version
		});
		const slotResult = applySlotSelectionForPlugin(next, result.pluginId);
		next = slotResult.config;
		await writeConfigFile(next);
		logSlotWarnings(slotResult.warnings);
		defaultRuntime.log(`Installed plugin: ${result.pluginId}`);
		defaultRuntime.log(`Restart the gateway to load plugins.`);
	});
	plugins.command("update").description("Update installed plugins (npm installs only)").argument("[id]", "Plugin id (omit with --all)").option("--all", "Update all tracked plugins", false).option("--dry-run", "Show what would change without writing", false).action(async (id, opts) => {
		const cfg = loadConfig();
		const installs = cfg.plugins?.installs ?? {};
		const targets = opts.all ? Object.keys(installs) : id ? [id] : [];
		if (targets.length === 0) {
			if (opts.all) {
				defaultRuntime.log("No npm-installed plugins to update.");
				return;
			}
			defaultRuntime.error("Provide a plugin id or use --all.");
			process.exit(1);
		}
		const result = await updateNpmInstalledPlugins({
			config: cfg,
			pluginIds: targets,
			dryRun: opts.dryRun,
			logger: {
				info: (msg) => defaultRuntime.log(msg),
				warn: (msg) => defaultRuntime.log(theme.warn(msg))
			}
		});
		for (const outcome of result.outcomes) {
			if (outcome.status === "error") {
				defaultRuntime.log(theme.error(outcome.message));
				continue;
			}
			if (outcome.status === "skipped") {
				defaultRuntime.log(theme.warn(outcome.message));
				continue;
			}
			defaultRuntime.log(outcome.message);
		}
		if (!opts.dryRun && result.changed) {
			await writeConfigFile(result.config);
			defaultRuntime.log("Restart the gateway to load plugins.");
		}
	});
	plugins.command("doctor").description("Report plugin load issues").action(() => {
		const report = buildPluginStatusReport();
		const errors = report.plugins.filter((p) => p.status === "error");
		const diags = report.diagnostics.filter((d) => d.level === "error");
		if (errors.length === 0 && diags.length === 0) {
			defaultRuntime.log("No plugin issues detected.");
			return;
		}
		const lines = [];
		if (errors.length > 0) {
			lines.push(theme.error("Plugin errors:"));
			for (const entry of errors) lines.push(`- ${entry.id}: ${entry.error ?? "failed to load"} (${entry.source})`);
		}
		if (diags.length > 0) {
			if (lines.length > 0) lines.push("");
			lines.push(theme.warn("Diagnostics:"));
			for (const diag of diags) {
				const target = diag.pluginId ? `${diag.pluginId}: ` : "";
				lines.push(`- ${target}${diag.message}`);
			}
		}
		const docs = formatDocsLink("/plugin", "docs.openclaw.ai/plugin");
		lines.push("");
		lines.push(`${theme.muted("Docs:")} ${docs}`);
		defaultRuntime.log(lines.join("\n"));
	});
}

//#endregion
export { registerPluginsCli };