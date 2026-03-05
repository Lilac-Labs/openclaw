import { PROFILE_ATTACH_RETRY_TIMEOUT_MS, resolveCdpReachabilityTimeouts } from "./cdp-timeouts.js";
import { isChromeCdpReady, isChromeReachable, stopOpenClawChrome } from "./chrome.js";
import type { ResolvedBrowserProfile } from "./config.js";
import {
  ensureChromeExtensionRelayServer,
  stopChromeExtensionRelayServer,
} from "./extension-relay.js";
import type {
  BrowserServerState,
  ContextOptions,
  ProfileRuntimeState,
} from "./server-context.types.js";

type AvailabilityDeps = {
  opts: ContextOptions;
  profile: ResolvedBrowserProfile;
  state: () => BrowserServerState;
  getProfileState: () => ProfileRuntimeState;
  setProfileRunning: (running: ProfileRuntimeState["running"]) => void;
};

type AvailabilityOps = {
  isHttpReachable: (timeoutMs?: number) => Promise<boolean>;
  isReachable: (timeoutMs?: number) => Promise<boolean>;
  ensureBrowserAvailable: () => Promise<void>;
  stopRunningBrowser: () => Promise<{ stopped: boolean }>;
};

export function createProfileAvailability({
  opts,
  profile,
  state,
  getProfileState,
  setProfileRunning,
}: AvailabilityDeps): AvailabilityOps {
  const resolveTimeouts = (timeoutMs: number | undefined) =>
    resolveCdpReachabilityTimeouts({
      profileIsLoopback: profile.cdpIsLoopback,
      timeoutMs,
      remoteHttpTimeoutMs: state().resolved.remoteCdpTimeoutMs,
      remoteHandshakeTimeoutMs: state().resolved.remoteCdpHandshakeTimeoutMs,
    });

  const isReachable = async (timeoutMs?: number) => {
    const { httpTimeoutMs, wsTimeoutMs } = resolveTimeouts(timeoutMs);
    return await isChromeCdpReady(profile.cdpUrl, httpTimeoutMs, wsTimeoutMs);
  };

  const isHttpReachable = async (timeoutMs?: number) => {
    const { httpTimeoutMs } = resolveTimeouts(timeoutMs);
    return await isChromeReachable(profile.cdpUrl, httpTimeoutMs);
  };

  const ensureBrowserAvailable = async (): Promise<void> => {
    const remoteCdp = !profile.cdpIsLoopback;
    const attachOnly = profile.attachOnly;
    const isExtension = profile.driver === "extension";
    const profileState = getProfileState();
    const httpReachable = await isHttpReachable();

    if (isExtension && remoteCdp) {
      throw new Error(
        `Profile "${profile.name}" uses driver=extension but cdpUrl is not loopback (${profile.cdpUrl}).`,
      );
    }

    if (isExtension) {
      if (!httpReachable) {
        await ensureChromeExtensionRelayServer({ cdpUrl: profile.cdpUrl });
        if (!(await isHttpReachable(PROFILE_ATTACH_RETRY_TIMEOUT_MS))) {
          throw new Error(
            `Chrome extension relay for profile "${profile.name}" is not reachable at ${profile.cdpUrl}.`,
          );
        }
      }
      // Browser startup should only ensure relay availability.
      // Tab attachment is checked when a tab is actually required.
      return;
    }

    if (!httpReachable) {
      if ((attachOnly || remoteCdp) && opts.onEnsureAttachTarget) {
        await opts.onEnsureAttachTarget(profile);
        if (await isHttpReachable(PROFILE_ATTACH_RETRY_TIMEOUT_MS)) {
          return;
        }
      }
      if (attachOnly || remoteCdp) {
        throw new Error(
          remoteCdp
            ? `Remote CDP for profile "${profile.name}" is not reachable at ${profile.cdpUrl}.`
            : `Browser attachOnly is enabled and profile "${profile.name}" is not running.`,
        );
      }
      // [lilac-start] block managed Chrome launch — force extension relay usage
      throw new Error(
        `Managed browser launch is disabled. Use the Browser Relay extension (profile="chrome") instead.`,
      );
      // [lilac-end]
    }

    // Port is reachable - check if we own it.
    if (await isReachable()) {
      return;
    }

    // HTTP responds but WebSocket fails. For attachOnly/remote profiles, never perform
    // local ownership/restart handling; just run attach retries and surface attach errors.
    if (attachOnly || remoteCdp) {
      if (opts.onEnsureAttachTarget) {
        await opts.onEnsureAttachTarget(profile);
        if (await isReachable(PROFILE_ATTACH_RETRY_TIMEOUT_MS)) {
          return;
        }
      }
      throw new Error(
        remoteCdp
          ? `Remote CDP websocket for profile "${profile.name}" is not reachable.`
          : `Browser attachOnly is enabled and CDP websocket for profile "${profile.name}" is not reachable.`,
      );
    }

    // HTTP responds but WebSocket fails - port in use by something else.
    if (!profileState.running) {
      throw new Error(
        `Port ${profile.cdpPort} is in use for profile "${profile.name}" but not by openclaw. ` +
          `Run action=reset-profile profile=${profile.name} to kill the process.`,
      );
    }

    // [lilac-start] block managed Chrome relaunch — force extension relay usage
    throw new Error(
      `Managed browser launch is disabled. Use the Browser Relay extension (profile="chrome") instead.`,
    );
    // [lilac-end]
  };

  const stopRunningBrowser = async (): Promise<{ stopped: boolean }> => {
    if (profile.driver === "extension") {
      const stopped = await stopChromeExtensionRelayServer({
        cdpUrl: profile.cdpUrl,
      });
      return { stopped };
    }
    const profileState = getProfileState();
    if (!profileState.running) {
      return { stopped: false };
    }
    await stopOpenClawChrome(profileState.running);
    setProfileRunning(null);
    return { stopped: true };
  };

  return {
    isHttpReachable,
    isReachable,
    ensureBrowserAvailable,
    stopRunningBrowser,
  };
}
