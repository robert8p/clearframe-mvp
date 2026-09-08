// Editorial releases must not erase completion or combine half-checks from
// different content versions into one apparently completed check.
export type VersionedDiagnosticRow = {
  id: string;
  is_published?: boolean;
  interaction_config?: Record<string, unknown> | null;
};
export function diagnosticContentVersion(row: VersionedDiagnosticRow): string {
  const version = row.interaction_config?.contentVersion;
  return typeof version === "string" && version.trim() ? version.trim() : "legacy";
}
export function completedDiagnosticVersion(
  answeredIds: readonly string[],
  definition: readonly VersionedDiagnosticRow[],
  required = 12,
): string | null {
  if (!Number.isInteger(required) || required < 1) throw new Error("Invalid check size");
  const byId = new Map(definition.map((row) => [row.id, row]));
  const grouped = new Map<string, Set<string>>();
  for (const id of new Set(answeredIds)) {
    const row = byId.get(id);
    if (!row) continue;
    const version = diagnosticContentVersion(row);
    const seen = grouped.get(version) ?? new Set<string>();
    seen.add(id);
    grouped.set(version, seen);
  }
  for (const [version, ids] of grouped) if (ids.size >= required) return version;
  return null;
}
export function hasCurrentDiagnosticAnswers(answeredIds: readonly string[], currentIds: readonly string[]): boolean {
  const current = new Set(currentIds);
  return answeredIds.some((id) => current.has(id));
}
