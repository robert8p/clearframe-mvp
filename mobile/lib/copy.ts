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
  // Literal escapes are meaningful in code examples. Preserve fenced/inline code.
  return value.split(/(```[\s\S]*?```|`[^`\n]*`)/g).map((part, index) => {
    if (index % 2) return part;
    return part.replace(/\r\n?/g, "\n")
      .replace(literalCrLf, "\n")
      .replace(literalLineBreak, "\n")
      .replace(literalTab, " ")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]*\n[ \t]*/g, "\n")
      .replace(/\n{3,}/g, "\n\n");
  }).join("").trim();
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/** Explicit display fields only: IDs, tokens, URLs and answer keys stay byte-for-byte intact. */
const DISPLAY_FIELDS = new Set([
  "title", "subtitle", "prompt", "options", "scenario_context", "description", "name",
  "label", "modeLabel", "situationLabel", "message", "explanation", "thinkingPrinciple",
  "application", "story", "twist", "principle", "try_it", "reveal", "ai_age", "instructions",
]);

export function cleanDisplayPayload<T>(value: T): T {
  function visit(item: unknown, display = false): unknown {
    if (typeof item === "string") return display ? cleanDisplayCopy(item) : item;
    if (Array.isArray(item)) return item.map((child) => visit(child, display));
    if (isPlainRecord(item)) return Object.fromEntries(Object.entries(item).map(([key, child]) => [key, visit(child, DISPLAY_FIELDS.has(key))]));
    return item;
  }
  return visit(value) as T;
}
