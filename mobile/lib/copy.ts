const literalCrLf = /\\r\\n/g;
const literalLineBreak = /\\[rn]/g;
const literalTab = /\\t/g;

/**
 * Repairs transport/import artefacts without rewriting legitimate prose.
 *
 * Content editors may intentionally use one or two real line breaks. The app
 * converts escaped control characters, normalises line endings, removes stray
 * whitespace around line breaks and limits blank space to one empty line.
 */
export function cleanDisplayCopy(value: string) {
  const normalised = value
    .replace(/\r\n?/g, "\n")
    .replace(literalCrLf, "\n")
    .replace(literalLineBreak, "\n")
    .replace(literalTab, " ")
    .replace(/\u00a0/g, " ");

  return normalised
    .split("\n")
    .map((line) => line.replace(/^[ \t]+|[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/**
 * API responses are JSON-shaped. Repair every display string as a final safety
 * net so one malformed content import cannot expose `\\n`, `\\r` or `\\t` in
 * any screen while the source record is being corrected.
 */
export function cleanDisplayPayload<T>(value: T): T {
  if (typeof value === "string") return cleanDisplayCopy(value) as T;
  if (Array.isArray(value)) return value.map((item) => cleanDisplayPayload(item)) as T;
  if (isPlainRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, cleanDisplayPayload(item)]),
    ) as T;
  }
  return value;
}
