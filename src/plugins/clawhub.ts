/**
 * ClawHub plugin install — removed.
 *
 * Exports are retained as stubs so that importers continue to compile.
 */

import type { ClawHubPackageChannel, ClawHubPackageFamily } from "../infra/clawhub.js";

export const CLAWHUB_INSTALL_ERROR_CODE = {
  INVALID_SPEC: "invalid_spec",
  PACKAGE_NOT_FOUND: "package_not_found",
  VERSION_NOT_FOUND: "version_not_found",
  NO_INSTALLABLE_VERSION: "no_installable_version",
  SKILL_PACKAGE: "skill_package",
  UNSUPPORTED_FAMILY: "unsupported_family",
  PRIVATE_PACKAGE: "private_package",
  INCOMPATIBLE_PLUGIN_API: "incompatible_plugin_api",
  INCOMPATIBLE_GATEWAY: "incompatible_gateway",
} as const;

export type ClawHubInstallErrorCode =
  (typeof CLAWHUB_INSTALL_ERROR_CODE)[keyof typeof CLAWHUB_INSTALL_ERROR_CODE];

export type ClawHubPluginInstallRecordFields = {
  source: "clawhub";
  clawhubUrl: string;
  clawhubPackage: string;
  clawhubFamily: Exclude<ClawHubPackageFamily, "skill">;
  clawhubChannel?: ClawHubPackageChannel;
  version?: string;
  integrity?: string;
  resolvedAt?: string;
  installedAt?: string;
};

export function formatClawHubSpecifier(params: { name: string; version?: string }): string {
  return `clawhub:${params.name}${params.version ? `@${params.version}` : ""}`;
}

export async function installPluginFromClawHub(_params: {
  spec: string;
  baseUrl?: string;
  token?: string;
  logger?: { info?: (message: string) => void; warn?: (message: string) => void };
  mode?: "install" | "update";
  dryRun?: boolean;
  expectedPluginId?: string;
}): Promise<{ ok: false; error: string; code?: ClawHubInstallErrorCode }> {
  return {
    ok: false,
    error: "ClawHub integration has been removed.",
    code: CLAWHUB_INSTALL_ERROR_CODE.INVALID_SPEC,
  };
}
