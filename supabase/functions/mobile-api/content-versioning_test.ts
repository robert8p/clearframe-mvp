import { completedDiagnosticVersion, diagnosticContentVersion, hasCurrentDiagnosticAnswers } from "./content-versioning.ts";
function equal(a: unknown, b: unknown) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${JSON.stringify(a)} !== ${JSON.stringify(b)}`); }
const old = Array.from({ length: 12 }, (_, i) => ({ id: `old-${i}`, is_published: false }));
const fresh = Array.from({ length: 12 }, (_, i) => ({ id: `new-${i}`, is_published: true, interaction_config: { contentVersion: "clarity_20260908_v1" } }));
const ids = (rows: { id: string }[]) => rows.map((row) => row.id);
Deno.test("archiving a completed legacy check preserves completion", () => equal(completedDiagnosticVersion(ids(old), [...old, ...fresh]), "legacy"));
Deno.test("a complete new check is recognised", () => equal(completedDiagnosticVersion(ids(fresh), [...old, ...fresh]), "clarity_20260908_v1"));
Deno.test("six old plus six new responses are not a completed check", () => equal(completedDiagnosticVersion([...ids(old.slice(0, 6)), ...ids(fresh.slice(0, 6))], [...old, ...fresh]), null));
Deno.test("duplicate response IDs cannot manufacture completion", () => equal(completedDiagnosticVersion(Array(12).fill("new-0"), fresh), null));
Deno.test("unknown challenge IDs cannot manufacture completion", () => equal(completedDiagnosticVersion(Array.from({length:12},(_,i)=>`unknown-${i}`), fresh), null));
Deno.test("unfinished retired check does not resume with unrelated new IDs", () => equal(hasCurrentDiagnosticAnswers(ids(old.slice(0, 3)), ids(fresh)), false));
Deno.test("unfinished current check resumes with its current IDs", () => equal(hasCurrentDiagnosticAnswers(["new-2"], ids(fresh)), true));
Deno.test("an unversioned legacy definition remains compatible", () => equal(diagnosticContentVersion({id:"example",interaction_config:{instructions:"Choose one"}}), "legacy"));
Deno.test("empty answers remain incomplete", () => equal(completedDiagnosticVersion([], fresh), null));
