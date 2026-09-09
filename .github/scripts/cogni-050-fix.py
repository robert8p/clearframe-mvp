# Idempotent final-release compatibility guard for Cogni 0.5.0.
# It must never create a commit merely because it has run before.
from pathlib import Path
import os
import subprocess

root = Path(__file__).resolve().parents[2]


def replace_if_present(rel: str, old: str, new: str) -> None:
    path = root / rel
    text = path.read_text()
    if old in text:
        path.write_text(text.replace(old, new))
    elif new not in text:
        raise SystemExit(f"Expected release contract missing in {rel}: {old}")


# Keep the unit-test dependency map valid and unique. Earlier preparation runs
# accidentally appended this same entry repeatedly; normalise it deterministically.
journey = root / "mobile/scripts/learner-journey.test.mjs"
text = journey.read_text()
visual_line = "    '@/components/visuals': { CogniIcon: 'CogniIcon', SkillMotif: 'SkillMotif', motifForSkill: () => 'reasoning' },\n"
count = text.count(visual_line)
if count == 0:
    anchor = "    '@/lib/feedback': { useFeedback: () => feedback },\n"
    if anchor not in text:
        raise SystemExit("learner-journey dependency-map anchor missing")
    text = text.replace(anchor, visual_line + anchor, 1)
elif count > 1:
    first = text.find(visual_line)
    text = text[:first] + visual_line + text[first + len(visual_line):].replace(visual_line, "")
journey.write_text(text)

# Installed-E2E copy must follow the actual 0.5.0 screen heading.
replace_if_present(
    ".github/scripts/cogni-auth-main-flow.py",
    'wait_for("See what’s changing", timeout=45)',
    'wait_for("Your progress, in perspective", timeout=45)',
)
replace_if_present(
    ".github/scripts/cogni-auth-route-e2e-fixed.py",
    '"See what’s changing"',
    '"Your progress, in perspective"',
)

# The release branch is self-healing only when this workflow still owns the
# branch tip. A superseded run may validate its local checkout but must never
# overwrite newer work.
if subprocess.run(["git", "diff", "--quiet"], cwd=root).returncode:
    expected = os.environ.get("GITHUB_SHA", "")
    remote = subprocess.check_output(
        ["git", "ls-remote", "origin", "refs/heads/release/cogni-0.5.0"],
        cwd=root,
        text=True,
    ).split()[0]
    if expected and remote != expected:
        print(f"Release branch advanced to {remote}; applying compatibility only to this superseded checkout.")
    else:
        subprocess.run(["git", "config", "user.name", "github-actions[bot]"], cwd=root, check=True)
        subprocess.run(["git", "config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"], cwd=root, check=True)
        subprocess.run(["git", "add", "-A"], cwd=root, check=True)
        subprocess.run(["git", "commit", "-m", "fix(release): normalise Cogni 0.5.0 verification harness"], cwd=root, check=True)
        subprocess.run(["git", "push", "origin", "HEAD:refs/heads/release/cogni-0.5.0"], cwd=root, check=True)
