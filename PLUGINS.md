# Plugin System Architecture

This document traces every point where plugins load in the OpenClaw codebase, how they register capabilities, and how they are cleaned up on shutdown.

## Plugin Loading Callsites

There are **7 production callsites** of `loadOpenClawPlugins()`, each serving a different entry path.

### 1. Gateway Startup — `src/gateway/server-plugins.ts:176`

The primary loading path. Triggered by `openclaw gateway run`:

```
src/index.ts
  → buildProgram()                        src/cli/program/build-program.ts
    → lazy "gateway" subcli               src/cli/program/register.subclis.ts
      → openclaw gateway run              src/cli/gateway-cli/run.ts
        → startGatewayServer()            src/gateway/server.impl.ts
          → loadGatewayPlugins()          src/gateway/server-plugins.ts
            → loadOpenClawPlugins()       src/plugins/loader.ts
```

This path provides a `subagent` runtime so plugins can dispatch gateway methods. After loading, the gateway calls `createChannelManager()` then `startChannels()`, which iterates every registered channel plugin and calls `plugin.gateway.startAccount()` per account.

### 2. Agent Runtime — `src/agents/runtime-plugins.ts:14`

For non-gateway contexts (`openclaw message send`, direct agent invocations). Ensures plugin tools, hooks, and providers are available during agent runs. No subagent runtime is provided — plugins cannot dispatch gateway methods in this mode.

### 3. Plugin CLI — `src/plugins/cli.ts:24`

For `openclaw plugins list` and similar management commands. Uses `mode: "validate"` — discovers and validates plugins without calling `register()`. No side effects.

### 4. Plugin Status — `src/plugins/status.ts:27`

For `openclaw status` and `openclaw channels status`. Same validate-only mode as the CLI path.

### 5. Plugin Providers — `src/plugins/providers.ts:14`

Discovers available LLM providers for model selection and auth wizards. Validate-only.

### 6. Plugin Tools — `src/plugins/tools.ts:61`

Resolves available agent tools from plugins. Full load (not validate-only), with caching enabled.

### 7. Onboarding Plugin Install — `src/commands/onboarding/plugin-install.ts:232`

During the interactive onboarding wizard after installing a new plugin via npm. Uses `cache: false` to force a fresh load so the newly-installed plugin activates immediately.

## Loading Pipeline

Every call to `loadOpenClawPlugins()` follows this sequence inside `src/plugins/loader.ts:517-897`.

### Phase 1: Configuration (lines 518-538)

1. **Test defaults** — in `VITEST` env, plugins are disabled by default (`applyTestPluginDefaults`).
2. **Normalize config** — resolves `plugins.enabled`, `plugins.allow`, `plugins.deny`, `plugins.entries`, `plugins.slots` (`normalizePluginsConfig`).
3. **Cache check** — builds a cache key from workspace dir + plugin paths + config hash. If hit in the LRU cache (max 32 entries), activates the cached registry and returns immediately.

### Phase 2: Discovery (lines 541-611)

4. **Clear commands** — wipes previously registered plugin commands.
5. **Lazy runtime** — creates a `PluginRuntime` via `Proxy` (deferred until a plugin actually accesses it, so startup paths that skip plugins don't load heavyweight deps).
6. **Empty registry** — `createPluginRegistry()` creates the registry and the `createApi` factory.
7. **Filesystem scan** — `discoverOpenClawPlugins()` scans four roots in precedence order (see [Plugin Source Roots](#plugin-source-roots)). For each directory, reads `package.json` for `openclaw.extensions` entries to locate entry points, or falls back to `index.{ts,js,mts,cts,mjs,cjs}`.
8. **Security checks** — per candidate: path escape detection, world-writable checks, ownership verification.
9. **Manifest loading** — `loadPluginManifestRegistry()` reads `openclaw.plugin.json` from each candidate root. Extracts `id`, `kind`, `channels`, `providers`, `configSchema`.
10. **Provenance index** — tracks install records and load paths for untracked-plugin warnings.

### Phase 3: Per-Plugin Loading Loop (lines 645-876)

For each discovered candidate:

11. **Manifest lookup** — skip if no `openclaw.plugin.json`.
12. **Duplicate check** — first origin wins. Later duplicates are marked `disabled: overridden by {origin}`.
13. **Enable state** — `resolveEffectiveEnableState()` checks the global toggle, per-plugin overrides, denylist, allowlist, and bundled default-enable rules.
14. **Memory slot** — for memory-kind plugins, `resolveMemorySlotDecision()` enforces only one memory plugin loads.
15. **Config schema** — must exist or plugin is rejected.
16. **Boundary check** — `openBoundaryFileSync()` verifies the entry path stays inside the plugin root (symlink/hardlink safety).
17. **Module load** — `getJiti()(safeSource)` uses the Jiti TypeScript loader with plugin SDK aliases (`openclaw/plugin-sdk` and `openclaw/plugin-sdk/{name}`).
18. **Export resolution** — `resolvePluginModuleExport()` extracts the plugin definition:
    - Default export is a function: that is the `register` function.
    - Default export is an object: look for `.register` or `.activate`.
19. **Config validation** — validates the plugin's config against its JSON schema via Ajv.
20. **Validate-only bail** — if `mode === "validate"`, push the record and continue without calling `register()`.
21. **API creation** — `createApi(record, { config, pluginConfig, hookPolicy })` builds the plugin API object.
22. **Registration** — `register(api)` is called synchronously. If it returns a promise, a diagnostic warning is emitted (async registration is not awaited).

### Phase 4: Finalization (lines 878-896)

23. **Provenance warnings** — flags plugins loaded without install provenance.
24. **Cache store** — writes the registry to the LRU cache.
25. **Activation** — `setActivePluginRegistry()` stores the registry in the global singleton. `initializeGlobalHookRunner()` creates the hook runner.

## Plugin Source Roots

Discovery scans four roots in this precedence order. First origin to claim a plugin ID wins.

| Origin      | Path                                         | Precedence    |
| ----------- | -------------------------------------------- | ------------- |
| `config`    | Paths from `plugins.loadPaths` in config     | 1st (highest) |
| `workspace` | `{workspaceDir}/.openclaw/extensions/`       | 2nd           |
| `bundled`   | `{package-root}/extensions/` (stock plugins) | 3rd           |
| `global`    | `~/.openclaw/extensions/`                    | 4th (lowest)  |

Defined in `src/plugins/roots.ts`.

## Plugin Registration API

When `register(api)` is called, the `api` object exposes these registration methods:

| Method                                   | What it registers                             | Stored in                  |
| ---------------------------------------- | --------------------------------------------- | -------------------------- |
| `registerTool(tool, opts?)`              | Agent tools (static or factory)               | `registry.tools`           |
| `registerHook(events, handler, opts?)`   | Internal hook handlers                        | `registry.hooks`           |
| `on(hookName, handler, opts?)`           | Typed plugin hooks                            | `registry.typedHooks`      |
| `registerHttpRoute(params)`              | HTTP endpoints                                | `registry.httpRoutes`      |
| `registerChannel(registration)`          | Messaging channels                            | `registry.channels`        |
| `registerProvider(provider)`             | LLM/auth providers                            | `registry.providers`       |
| `registerGatewayMethod(method, handler)` | Gateway RPC methods                           | `registry.gatewayHandlers` |
| `registerCli(registrar, opts?)`          | CLI subcommands                               | `registry.cliRegistrars`   |
| `registerService(service)`               | Background services with start/stop lifecycle | `registry.services`        |
| `registerCommand(command)`               | Plugin commands (bypass LLM)                  | `registry.commands`        |
| `registerContextEngine(id, factory)`     | Context engine (exclusive slot)               | Context engine registry    |

The full type is `OpenClawPluginApi` in `src/plugins/types.ts`.

## How Plugins Are Consumed After Loading

| System          | Access pattern                                                                              | Key file                             |
| --------------- | ------------------------------------------------------------------------------------------- | ------------------------------------ |
| Channels        | `requireActivePluginRegistry().channels` sorted by order, then `startAccount()` per account | `src/channels/plugins/index.ts`      |
| Agent tools     | `registry.tools` → call each factory with context → collect tool arrays                     | `src/plugins/tools.ts`               |
| Hooks           | `createHookRunner(registry)` → `runner.runBeforeAgentStart()`, etc.                         | `src/plugins/hooks.ts`               |
| HTTP routes     | `registry.httpRoutes` matched by path                                                       | `src/gateway/server/plugins-http.ts` |
| Gateway methods | `registry.gatewayHandlers` merged with core handlers, dispatched via WS                     | `src/gateway/server-methods.ts`      |
| CLI extensions  | `registry.cliRegistrars` → `register({ program })` adds Commander subcommands               | `src/cli/plugins-cli.ts`             |
| Providers       | `registry.providers` → model discovery, auth wizard                                         | `src/plugins/provider-discovery.ts`  |
| Services        | `registry.services` → `service.start()` / `service.stop()`                                  | `src/plugins/services.ts`            |
| Commands        | `registry.commands` → `matchPluginCommand()` → `executePluginCommand()`                     | `src/plugins/commands.ts`            |

## Plugin Lifecycle and Cleanup

### Startup Order

During gateway startup (`src/gateway/server-startup.ts`), resources start in this order:

1. Session lock cleanup
2. Browser control server
3. Gmail watcher
4. Internal hooks
5. **Channel plugins** (`startChannels()` — calls `plugin.gateway.startAccount()` per channel/account)
6. Internal hook event: `gateway:startup`
7. **Plugin services** (`startPluginServices()` — calls `service.start()` sequentially)
8. ACP identity reconciliation
9. Memory backend
10. Restart sentinel

### Shutdown Order

When the gateway closes (`src/gateway/server.impl.ts:1048-1068` then `src/gateway/server-close.ts`):

1. **`gateway_stop` hooks** — `runGlobalGatewayStopSafely()` fires all registered `gateway_stop` handlers (parallel).
2. Stop diagnostics heartbeat, skills refresh, rate limiters, channel health monitor.
3. **`close()`** handler (`server-close.ts:35-137`):
   - Stop Bonjour, Tailscale
   - Close canvas host
   - **Stop all channel plugins** — iterates `listChannelPlugins()`, calls `stopChannel(plugin.id)` for each
   - **Stop all plugin services** — `pluginServices.stop()` iterates services in reverse order, calls each `stop()`
   - Stop Gmail watcher, cron, heartbeat
   - Clear all intervals (tick, health, dedupe, media)
   - Broadcast `"shutdown"` to WS clients, close all connections
   - Stop config reloader, browser control
   - Close WebSocket server, HTTP servers

### Long-Lived Plugins and Resource Cleanup

Plugins can hold persistent resources (watchers, intervals, sockets). There are three cleanup mechanisms, and one gap.

#### `registerService()` — recommended

The intended mechanism for persistent work. Services get automatic cleanup:

```typescript
export default function register(api) {
  let watcher;

  api.registerService({
    id: "my-file-watcher",
    start() {
      watcher = fs.watch("/some/path", (event, filename) => {
        // handle changes
      });
    },
    stop() {
      watcher?.close();
    },
  });
}
```

`stop()` is called in reverse registration order during gateway close. Errors are caught and logged — one service failing to stop does not prevent others from stopping.

#### `on("gateway_stop", handler)` — hook-based cleanup

For plugins that hold resources but did not use `registerService`:

```typescript
export default function register(api) {
  const interval = setInterval(() => poll(), 5000);

  api.on("gateway_stop", () => {
    clearInterval(interval);
  });
}
```

Fires before the close handler runs.

#### Channel plugins — `gateway.stopAccount`

Channel plugins registered via `registerChannel()` have their own lifecycle. The channel manager calls `plugin.gateway.startAccount()` on startup and `stopChannel()` on shutdown.

#### The gap: rogue resources

During `register()`, nothing prevents a plugin from creating resources that are never cleaned up:

```typescript
export default function register(api) {
  setInterval(() => pollSomething(), 5000); // leaked
  fs.watch("/some/path", callback); // leaked
  net.createServer().listen(9999); // leaked
}
```

The system does not track arbitrary resources created during `register()`. The `register()` call is synchronous — the loader calls it and moves on. The gateway does not force `process.exit()` after shutdown; it relies on the event loop draining naturally. A single leaked timer or watcher keeps the entire process alive.

| How resources are held                         | Cleaned up on shutdown?                  |
| ---------------------------------------------- | ---------------------------------------- |
| `registerService({ start, stop })`             | Yes — `stop()` called in reverse order   |
| `on("gateway_stop", cleanup)`                  | Yes — fires before close handler         |
| `registerChannel()` with `gateway.stopAccount` | Yes — `stopChannel()` called per channel |
| Raw `setInterval` in `register()`              | **No** — leaked, process won't exit      |
| Raw `fs.watch` in `register()`                 | **No** — keeps event loop alive          |
| Raw `child_process.spawn` in `register()`      | **No** — orphaned child process          |
| Raw `net.createServer` in `register()`         | **No** — port stays bound                |

**Always use `registerService` or `on("gateway_stop")` for persistent work.**

## Environment Variables

| Variable                                  | Effect                                      |
| ----------------------------------------- | ------------------------------------------- |
| `OPENCLAW_SKIP_CHANNELS`                  | Skip channel loading during gateway startup |
| `OPENCLAW_DISABLE_PLUGIN_LOADER_CACHE`    | Disable the registry LRU cache              |
| `OPENCLAW_DISABLE_PLUGIN_DISCOVERY_CACHE` | Disable discovery cache                     |
| `OPENCLAW_PLUGIN_DISCOVERY_CACHE_MS`      | Discovery cache TTL (default: 1000ms)       |
| `OPENCLAW_PLUGIN_MANIFEST_CACHE_MS`       | Manifest cache TTL                          |
| `VITEST`                                  | Auto-disables plugins in test environment   |

## Key Files

| File                                | Purpose                                                |
| ----------------------------------- | ------------------------------------------------------ |
| `src/plugins/loader.ts`             | Core loading pipeline (`loadOpenClawPlugins`)          |
| `src/plugins/discovery.ts`          | Filesystem scanning and candidate collection           |
| `src/plugins/manifest-registry.ts`  | Reads and caches `openclaw.plugin.json` manifests      |
| `src/plugins/registry.ts`           | Creates the registry and plugin API factory            |
| `src/plugins/runtime.ts`            | Global singleton for the active plugin registry        |
| `src/plugins/hook-runner-global.ts` | Global hook runner singleton                           |
| `src/plugins/hooks.ts`              | Hook execution engine                                  |
| `src/plugins/services.ts`           | Service start/stop lifecycle                           |
| `src/plugins/types.ts`              | Plugin API types and hook name definitions             |
| `src/plugins/config-state.ts`       | Enable state resolution (allow/deny/slots)             |
| `src/plugins/roots.ts`              | Source root resolution (stock/global/workspace)        |
| `src/plugins/commands.ts`           | Plugin command registration and dispatch               |
| `src/plugin-sdk/index.ts`           | SDK exports for plugin authors                         |
| `src/channels/plugins/index.ts`     | Channel plugin runtime registry                        |
| `src/gateway/server-plugins.ts`     | Gateway-specific plugin loading wrapper                |
| `src/gateway/server-startup.ts`     | Sidecar startup (channels, services, hooks)            |
| `src/gateway/server-close.ts`       | Shutdown handler (reverse teardown)                    |
| `src/gateway/server-channels.ts`    | Channel manager (start/stop/restart per account)       |
| `extensions/*/openclaw.plugin.json` | Per-plugin runtime manifest                            |
| `extensions/*/package.json`         | Per-plugin package manifest (with `openclaw` metadata) |
| `extensions/*/index.ts`             | Per-plugin entry point                                 |
