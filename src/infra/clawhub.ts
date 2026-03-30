/**
 * ClawHub integration — removed.
 *
 * This module retains its public type/function exports so that existing
 * importers continue to compile, but all runtime behaviour is stubbed out
 * (functions throw or return empty values).
 */

export type ClawHubPackageFamily = "skill" | "code-plugin" | "bundle-plugin";
export type ClawHubPackageChannel = "official" | "community" | "private";
export type ClawHubPackageCompatibility = {
  pluginApiRange?: string;
  builtWithOpenClawVersion?: string;
  minGatewayVersion?: string;
};

export type ClawHubPackageListItem = {
  name: string;
  displayName: string;
  family: ClawHubPackageFamily;
  runtimeId?: string | null;
  channel: ClawHubPackageChannel;
  isOfficial: boolean;
  summary?: string | null;
  ownerHandle?: string | null;
  createdAt: number;
  updatedAt: number;
  latestVersion?: string | null;
  capabilityTags?: string[];
  executesCode?: boolean;
  verificationTier?: string | null;
};

export type ClawHubPackageDetail = {
  package:
    | (ClawHubPackageListItem & {
        tags?: Record<string, string>;
        compatibility?: ClawHubPackageCompatibility | null;
        capabilities?: {
          executesCode?: boolean;
          runtimeId?: string;
          capabilityTags?: string[];
          bundleFormat?: string;
          hostTargets?: string[];
          pluginKind?: string;
          channels?: string[];
          providers?: string[];
          hooks?: string[];
          bundledSkills?: string[];
        } | null;
        verification?: {
          tier?: string;
          scope?: string;
          summary?: string;
          sourceRepo?: string;
          sourceCommit?: string;
          hasProvenance?: boolean;
          scanStatus?: string;
        } | null;
      })
    | null;
  owner?: {
    handle?: string | null;
    displayName?: string | null;
    image?: string | null;
  } | null;
};

export type ClawHubPackageVersion = {
  package: {
    name: string;
    displayName: string;
    family: ClawHubPackageFamily;
  } | null;
  version: {
    version: string;
    createdAt: number;
    changelog: string;
    distTags?: string[];
    files?: unknown;
    compatibility?: ClawHubPackageCompatibility | null;
    capabilities?: ClawHubPackageDetail["package"] extends infer T
      ? T extends { capabilities?: infer C }
        ? C
        : never
      : never;
    verification?: ClawHubPackageDetail["package"] extends infer T
      ? T extends { verification?: infer C }
        ? C
        : never
      : never;
  } | null;
};

export type ClawHubPackageSearchResult = {
  score: number;
  package: ClawHubPackageListItem;
};

export type ClawHubSkillSearchResult = {
  score: number;
  slug: string;
  displayName: string;
  summary?: string;
  version?: string;
  updatedAt?: number;
};

export type ClawHubSkillDetail = {
  skill: {
    slug: string;
    displayName: string;
    summary?: string;
    tags?: Record<string, string>;
    createdAt: number;
    updatedAt: number;
  } | null;
  latestVersion?: {
    version: string;
    createdAt: number;
    changelog?: string;
  } | null;
  metadata?: {
    os?: string[] | null;
    systems?: string[] | null;
  } | null;
  owner?: {
    handle?: string | null;
    displayName?: string | null;
    image?: string | null;
  } | null;
};

export type ClawHubSkillListResponse = {
  items: Array<{
    slug: string;
    displayName: string;
    summary?: string;
    tags?: Record<string, string>;
    latestVersion?: {
      version: string;
      createdAt: number;
      changelog?: string;
    } | null;
    metadata?: {
      os?: string[] | null;
      systems?: string[] | null;
    } | null;
    createdAt: number;
    updatedAt: number;
  }>;
  nextCursor?: string | null;
};

export type ClawHubDownloadResult = {
  archivePath: string;
  integrity: string;
};

export class ClawHubRequestError extends Error {
  readonly status: number;
  readonly requestPath: string;
  readonly responseBody: string;

  constructor(params: { path: string; status: number; body: string }) {
    super(`ClawHub ${params.path} failed (${params.status}): ${params.body}`);
    this.name = "ClawHubRequestError";
    this.status = params.status;
    this.requestPath = params.path;
    this.responseBody = params.body;
  }
}

export function resolveClawHubBaseUrl(_baseUrl?: string): string {
  return "";
}

export function formatSha256Integrity(_bytes: Uint8Array): string {
  return "";
}

export function parseClawHubPluginSpec(_raw: string): {
  name: string;
  version?: string;
  baseUrl?: string;
} | null {
  return null;
}

export async function resolveClawHubAuthToken(): Promise<string | undefined> {
  return undefined;
}

export async function fetchClawHubPackageDetail(_params: {
  name: string;
  baseUrl?: string;
  token?: string;
  timeoutMs?: number;
}): Promise<ClawHubPackageDetail> {
  return { package: null };
}

export async function fetchClawHubPackageVersion(_params: {
  name: string;
  version: string;
  baseUrl?: string;
  token?: string;
  timeoutMs?: number;
}): Promise<ClawHubPackageVersion> {
  return { package: null, version: null };
}

export async function searchClawHubPackages(_params: {
  query: string;
  family?: ClawHubPackageFamily;
  baseUrl?: string;
  token?: string;
  timeoutMs?: number;
  limit?: number;
}): Promise<ClawHubPackageSearchResult[]> {
  return [];
}

export async function searchClawHubSkills(_params: {
  query: string;
  baseUrl?: string;
  token?: string;
  timeoutMs?: number;
  limit?: number;
}): Promise<ClawHubSkillSearchResult[]> {
  return [];
}

export async function fetchClawHubSkillDetail(_params: {
  slug: string;
  baseUrl?: string;
  token?: string;
  timeoutMs?: number;
}): Promise<ClawHubSkillDetail> {
  return { skill: null };
}

export async function listClawHubSkills(_params: {
  baseUrl?: string;
  token?: string;
  timeoutMs?: number;
  limit?: number;
}): Promise<ClawHubSkillListResponse> {
  return { items: [] };
}

export async function downloadClawHubPackageArchive(_params: {
  name: string;
  version?: string;
  tag?: string;
  baseUrl?: string;
  token?: string;
  timeoutMs?: number;
}): Promise<ClawHubDownloadResult> {
  throw new Error("ClawHub integration has been removed.");
}

export async function downloadClawHubSkillArchive(_params: {
  slug: string;
  version?: string;
  tag?: string;
  baseUrl?: string;
  token?: string;
  timeoutMs?: number;
}): Promise<ClawHubDownloadResult> {
  throw new Error("ClawHub integration has been removed.");
}

export function resolveLatestVersionFromPackage(_detail: ClawHubPackageDetail): string | null {
  return null;
}

export function isClawHubFamilySkill(_detail: ClawHubPackageDetail | ClawHubSkillDetail): boolean {
  return false;
}

export function satisfiesPluginApiRange(
  _pluginApiVersion: string,
  _pluginApiRange?: string | null,
): boolean {
  return true;
}

export function satisfiesGatewayMinimum(
  _currentVersion: string,
  _minGatewayVersion?: string | null,
): boolean {
  return true;
}
