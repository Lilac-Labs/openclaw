import { createSubsystemLogger } from "../logging/subsystem.js";

const log = createSubsystemLogger("browser/target-id");

export type TargetIdResolution =
  | { ok: true; targetId: string }
  | { ok: false; reason: "not_found" | "ambiguous"; matches?: string[] };

export function resolveTargetIdFromTabs(
  input: string,
  tabs: Array<{ targetId: string }>,
): TargetIdResolution {
  const needle = input.trim();
  if (!needle) {
    log.debug("resolveTargetIdFromTabs: empty input");
    return { ok: false, reason: "not_found" };
  }

  log.debug(`resolveTargetIdFromTabs: prefix=${needle}, candidates=${tabs.length}`);

  const exact = tabs.find((t) => t.targetId === needle);
  if (exact) {
    log.debug(`resolveTargetIdFromTabs: exact match ${exact.targetId}`);
    return { ok: true, targetId: exact.targetId };
  }

  const lower = needle.toLowerCase();
  const matches = tabs.map((t) => t.targetId).filter((id) => id.toLowerCase().startsWith(lower));

  const only = matches.length === 1 ? matches[0] : undefined;
  if (only) {
    log.debug(`resolveTargetIdFromTabs: unique prefix match ${only}`);
    return { ok: true, targetId: only };
  }
  if (matches.length === 0) {
    log.debug(
      `resolveTargetIdFromTabs: no match for prefix=${needle}, available=[${tabs.map((t) => t.targetId).join(", ")}]`,
    );
    return { ok: false, reason: "not_found" };
  }
  log.debug(`resolveTargetIdFromTabs: ambiguous prefix=${needle}, matches=[${matches.join(", ")}]`);
  return { ok: false, reason: "ambiguous", matches };
}
