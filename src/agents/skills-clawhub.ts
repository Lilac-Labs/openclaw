/**
 * ClawHub skills — removed.
 *
 * Exports are retained as stubs so that importers continue to compile.
 */

import type { ClawHubSkillDetail, ClawHubSkillSearchResult } from "../infra/clawhub.js";

export type ClawHubSkillOrigin = {
  version: 1;
  registry: string;
  slug: string;
  installedVersion: string;
  installedAt: number;
};

export type ClawHubSkillsLockfile = {
  version: 1;
  skills: Record<
    string,
    {
      version: string;
      installedAt: number;
    }
  >;
};

export type InstallClawHubSkillResult =
  | {
      ok: true;
      slug: string;
      version: string;
      targetDir: string;
      detail: ClawHubSkillDetail;
    }
  | { ok: false; error: string };

export type UpdateClawHubSkillResult =
  | {
      ok: true;
      slug: string;
      previousVersion: string | null;
      version: string;
      changed: boolean;
      targetDir: string;
    }
  | { ok: false; error: string };

export async function readClawHubSkillsLockfile(
  _workspaceDir: string,
): Promise<ClawHubSkillsLockfile> {
  return { version: 1, skills: {} };
}

export async function writeClawHubSkillsLockfile(
  _workspaceDir: string,
  _lockfile: ClawHubSkillsLockfile,
): Promise<void> {}

export async function readClawHubSkillOrigin(
  _skillDir: string,
): Promise<ClawHubSkillOrigin | null> {
  return null;
}

export async function writeClawHubSkillOrigin(
  _skillDir: string,
  _origin: ClawHubSkillOrigin,
): Promise<void> {}

export async function searchSkillsFromClawHub(_params: {
  query?: string;
  limit?: number;
  baseUrl?: string;
}): Promise<ClawHubSkillSearchResult[]> {
  return [];
}

export async function installSkillFromClawHub(_params: {
  workspaceDir: string;
  slug: string;
  version?: string;
  baseUrl?: string;
  force?: boolean;
  logger?: { info?: (message: string) => void };
}): Promise<InstallClawHubSkillResult> {
  return { ok: false, error: "ClawHub integration has been removed." };
}

export async function updateSkillsFromClawHub(_params: {
  workspaceDir: string;
  slug?: string;
  baseUrl?: string;
  logger?: { info?: (message: string) => void };
}): Promise<UpdateClawHubSkillResult[]> {
  return [];
}

export async function readTrackedClawHubSkillSlugs(_workspaceDir: string): Promise<string[]> {
  return [];
}

export async function computeSkillFingerprint(_skillDir: string): Promise<string> {
  return "";
}
