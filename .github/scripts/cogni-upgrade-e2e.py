#!/usr/bin/env python3
"""Prove that the released 0.4.2 APK upgrades in place to Cogni 0.4.3.

Run on the disposable Android emulator BEFORE the clean-install suites. The
workflow verifies PREVIOUS_APK_PATH against the published release SHA-256. This
suite records both APK hashes and never clears or uninstalls the baseline after
sign-in: only ``adb install -r`` may replace it. Credentials are never changed.
"""

from __future__ import annotations

import hashlib
import importlib.util
import json
import os
import re
import time
from pathlib import Path
from types import ModuleType

ROOT = Path(__file__).resolve().parent
PACKAGE = "app.gocogni.cogni"
ACTIVITY = f"{PACKAGE}/.MainActivity"
OUT = Path(f"/tmp/cogni-upgrade-api-{os.environ.get('API_LEVEL', '36')}")
EXPECTED_PREVIOUS_VERSION = "0.4.4"
EXPECTED_VERSION = "0.4.5"


def load_automation() -> ModuleType:
    spec = importlib.util.spec_from_file_location(
        "cogni_upgrade_automation", ROOT / "cogni-auth-route-e2e-fixed.py"
    )
    if spec is None or spec.loader is None:
        raise RuntimeError("Could not load the reliable Android automation runner")
    runner = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(runner)
    ui = runner.load_suite(ROOT / "cogni-copy-feedback-e2e.py")
    OUT.mkdir(parents=True, exist_ok=True)
    ui.OUT = OUT
    # The workflow creates an auth account only. Home redirects accounts without
    # an audience to onboarding, so reuse the full suite's verified API fixture.
    profile_suite = runner.load_suite(ROOT / "cogni-auth-main-flow.py")
    profile_suite.OUT = OUT
    ui.provision_profile = profile_suite.provision_profile
    runner.install_reliable_automation(ui)
    return ui


def aapt_path() -> Path:
    build_tools = Path(os.environ["ANDROID_HOME"]) / "build-tools"
    candidates = list(build_tools.glob("*/aapt"))
    if not candidates:
        raise RuntimeError("Android build-tools/aapt is required to inspect both APKs")
    return max(candidates, key=lambda path: tuple(int(n) for n in re.findall(r"\d+", path.parent.name)))


def inspect_apk(ui: ModuleType, aapt: Path, apk: Path, expected: str, label: str) -> dict[str, object]:
    if not apk.is_file():
        raise AssertionError(f"Missing {label} APK: {apk}")
    badging = ui.run(str(aapt), "dump", "badging", str(apk))
    (OUT / f"apk-badging-{label}.txt").write_text(badging, encoding="utf-8")
    match = re.search(r"^package: name='([^']+)' versionCode='(\d+)' versionName='([^']+)'", badging, re.MULTILINE)
    if not match:
        raise AssertionError(f"Could not read {label} APK identity")
    package, code, version = match.groups()
    if package != PACKAGE or version != expected:
        raise AssertionError(f"Unexpected {label} APK identity: {package}, version {version}")
    with apk.open("rb") as stream:
        digest = hashlib.file_digest(stream, "sha256").hexdigest()
    return {"package": package, "versionName": version, "versionCode": int(code), "sha256": digest}


def installed_identity(ui: ModuleType, expected: dict[str, object], label: str) -> dict[str, object]:
    package_dump = ui.adb("shell", "dumpsys", "package", PACKAGE)
    (OUT / f"package-{label}.txt").write_text(package_dump, encoding="utf-8")
    if f"Package [{PACKAGE}]" not in package_dump:
        raise AssertionError(f"Expected Cogni package is not installed at {label}")
    identity: dict[str, object] = {"package": PACKAGE}
    for name, pattern in {
        "versionName": r"^\s*versionName=(\S+)",
        "versionCode": r"^\s*versionCode=(\d+)",
        "userId": r"^\s*(?:userId|appId)=(\d+)",
        "firstInstallTime": r"^\s*firstInstallTime=(.+)",
        "lastUpdateTime": r"^\s*lastUpdateTime=(.+)",
    }.items():
        match = re.search(pattern, package_dump, re.MULTILINE)
        if not match:
            raise AssertionError(f"Missing installed {name} at {label}")
        identity[name] = int(match.group(1)) if name in {"versionCode", "userId"} else match.group(1).strip()
    for name in ("package", "versionName", "versionCode"):
        if identity[name] != expected[name]:
            raise AssertionError(f"Installed {name} does not match the inspected {label} APK")
    return identity


def launch(ui: ModuleType, label: str) -> None:
    ui.adb("shell", "am", "force-stop", PACKAGE)
    output = ui.adb("shell", "am", "start", "-W", "-n", ACTIVITY)
    (OUT / f"launch-{label}.txt").write_text(output, encoding="utf-8")
    time.sleep(4)
    if not ui.adb("shell", "pidof", PACKAGE, check=False).strip():
        raise AssertionError(f"Cogni process exited during {label}")


def assert_account(ui: ModuleType, email: str, label: str) -> str:
    ui.wait_for("Home", timeout=60)
    ui.tap("Profile")
    ui.scroll_to_top()
    ui.wait_for(email, timeout=45)
    nodes = ui.dump_ui(f"account-{label}")
    if not any(email.casefold() in {node.text.strip().casefold(), node.description.strip().casefold()} for node in nodes):
        raise AssertionError(f"The exact signed-in account email is missing at {label}")
    ui.capture(f"account-{label}")
    # Record an identity fingerprint; credentials are never written to result.json.
    return hashlib.sha256(email.casefold().encode("utf-8")).hexdigest()


def preferences(ui: ModuleType, evidence_label: str | None = None) -> dict[str, bool]:
    # Each read starts above the section. A long description or large system text
    # can put the first switch above the viewport after finding the second one.
    result: dict[str, bool] = {}
    for label in ("Sound effects", "Haptic feedback"):
        ui.scroll_to_top()
        result[label] = ui.switch_state(label, scroll=True)
        if evidence_label:
            ui.capture(f"{evidence_label}-{ui.slug(label)}")
    return result


def assert_healthy(ui: ModuleType, label: str) -> None:
    ui.assert_no_fatal_crash()
    logs = ui.adb("logcat", "-d", "-v", "threadtime", check=False)
    (OUT / f"logcat-{label}.txt").write_text(logs, encoding="utf-8")
    if re.search(rf"Fatal signal .*\({re.escape(PACKAGE)}\)|Abort message:.*{re.escape(PACKAGE)}", logs):
        raise AssertionError(f"Native crash during {label}")
    if not ui.adb("shell", "pidof", PACKAGE, check=False).strip():
        raise AssertionError(f"Cogni process is not running at {label}")
    activity = ui.adb("shell", "dumpsys", "activity", "activities", check=False)
    windows = ui.adb("shell", "dumpsys", "window", "windows", check=False)
    (OUT / f"activity-{label}.txt").write_text(activity, encoding="utf-8")
    (OUT / f"windows-{label}.txt").write_text(windows, encoding="utf-8")
    focus = [line for line in (activity + windows).splitlines() if any(marker in line for marker in ("mCurrentFocus", "mFocusedApp", "topResumedActivity"))]
    if not any(PACKAGE in line for line in focus):
        raise AssertionError(f"Cogni is not the foreground application at {label}")


def main() -> int:
    ui = load_automation()
    result: dict[str, object] = {"status": "running", "package": PACKAGE, "apiLevel": os.environ.get("API_LEVEL", "36")}
    try:
        previous_apk = Path(os.environ["PREVIOUS_APK_PATH"])
        current_apk = Path(os.environ["APK_PATH"])
        email, password = os.environ["E2E_EMAIL"], os.environ["E2E_PASSWORD"]
        aapt = aapt_path()
        previous = inspect_apk(ui, aapt, previous_apk, EXPECTED_PREVIOUS_VERSION, "previous")
        current = inspect_apk(ui, aapt, current_apk, EXPECTED_VERSION, "current")
        if int(current["versionCode"]) <= int(previous["versionCode"]):
            raise AssertionError("Upgrade versionCode must be strictly greater than the released versionCode")
        result.update({"previousApk": previous, "currentApk": current})

        ui.adb("wait-for-device")
        if ui.adb("shell", "getprop", "ro.kernel.qemu").strip() != "1":
            raise AssertionError("Upgrade suite requires a disposable Android emulator")
        actual_api = ui.adb("shell", "getprop", "ro.build.version.sdk").strip()
        if actual_api != str(result["apiLevel"]):
            raise AssertionError(f"Emulator API {actual_api} differs from the requested evidence API")

        # Seed the disposable learning context before preparing the baseline.
        # No profile/account changes occur once the old-version session is set.
        ui.provision_profile()
        result["profileFixture"] = "Existing main-suite API fixture: casual/everyday_decisions/think_more_clearly"

        # This is the ONLY uninstall, before the previous release is installed.
        # Never clear data or uninstall after preparing the authenticated baseline.
        ui.adb("uninstall", PACKAGE, check=False)
        (OUT / "install-previous.txt").write_text(ui.adb("install", str(previous_apk)), encoding="utf-8")
        before = installed_identity(ui, previous, "before")
        result["installedBefore"] = before
        ui.adb("logcat", "-c")
        launch(ui, "previous")
        ui.scroll_to_top()
        ui.wait_for("Make room for a clearer perspective.")
        ui.tap("I already have an account", scroll=True)
        ui.wait_for("Welcome back")
        ui.input_text("Email", email)
        ui.input_text("Password", password, scroll=True)
        ui.tap("Sign in", scroll=True)
        before_account = assert_account(ui, email, "before")

        initial = preferences(ui)
        changed = {label: not enabled for label, enabled in initial.items()}
        for label in changed:
            ui.scroll_to_top()
            ui.tap(label, scroll=True)
        if preferences(ui, "preferences-before") != changed:
            raise AssertionError("Could not persist deliberately changed baseline feedback preferences")
        ui.capture("preferences-before")
        result.update({"initialPreferences": initial, "expectedPreferences": changed, "accountFingerprintBefore": before_account})

        # A baseline restart proves the settings have reached persistent storage
        # before any upgrade occurs, isolating a migration failure from a UI race.
        launch(ui, "previous-persistence")
        if assert_account(ui, email, "previous-persistence") != before_account or preferences(ui) != changed:
            raise AssertionError("Baseline account/preferences did not survive a cold restart")
        assert_healthy(ui, "previous")

        ui.adb("shell", "am", "force-stop", PACKAGE)
        # -r preserves data and Android verifies matching package/signing identity.
        # No -d downgrade, uninstall, pm clear, credential entry or profile mutation.
        install_output = ui.adb("install", "-r", str(current_apk))
        (OUT / "install-replace.txt").write_text(install_output, encoding="utf-8")
        if "Success" not in install_output:
            raise AssertionError("Android did not confirm a successful in-place APK replacement")
        after = installed_identity(ui, current, "after")
        result["installedAfter"] = after
        for name in ("package", "userId", "firstInstallTime"):
            if after[name] != before[name]:
                raise AssertionError(f"In-place upgrade unexpectedly changed Android {name}")

        launch(ui, "upgraded")
        after_account = assert_account(ui, email, "after")
        actual_preferences = preferences(ui, "preferences-after")
        if after_account != before_account:
            raise AssertionError("Upgrade changed the signed-in account identity")
        if actual_preferences != changed:
            raise AssertionError("Upgrade lost sound or haptic preferences")
        ui.capture("preferences-after")
        result.update({"accountFingerprintAfter": after_account, "actualPreferences": actual_preferences, "authenticatedWithoutSigningInAgain": True})
        assert_healthy(ui, "upgraded")

        # Leave the account and password intact for the independent full suites.
        ui.tap("Sign out", scroll=True)
        ui.scroll_to_top()
        ui.wait_for("Sharpen how you think.", timeout=45)
        assert_healthy(ui, "signed-out")
        ui.capture("pass")
        result.update({"status": "passed", "signedOutAtEnd": True, "signingCompatibility": "Android accepted adb install -r", "completedAtUtc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())})
        print("PASS: Cogni 0.4.4 upgraded in place to 0.4.5; package, Android UID, original installation, authenticated account, sound preference and haptic preference survived without a crash. Signed out for the following suites.")
        return 0
    except Exception as error:
        result.update({"status": "failed", "error": str(error)})
        try:
            ui.capture("failure")
        except Exception as capture_error:
            print(f"Could not capture failure UI: {capture_error}")
        raise
    finally:
        (OUT / "result.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    raise SystemExit(main())
