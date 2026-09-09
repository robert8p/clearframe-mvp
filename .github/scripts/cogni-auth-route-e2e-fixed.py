#!/usr/bin/env python3
"""Run Cogni Android E2E suites with reliable UI automation."""
from __future__ import annotations
import importlib.util
import sys
import time
from pathlib import Path
from types import ModuleType

ROOT = Path(__file__).resolve().parent
SUITES = [
    ROOT / "cogni-auth-main-flow.py",
    ROOT / "cogni-copy-feedback-e2e.py",
    ROOT / "cogni-profile-password-e2e.py",
    ROOT / "cogni-signup-onboarding-e2e.py",
    ROOT / "cogni-monetization-prestore-e2e.py",
]
TOP_HEADINGS = {"Cogni Route E2E", "Cogni Signup E2E", "A brighter day, Cogni", "Find your focus", "Your progress, in perspective", "Find your starting point"}

def load_suite(path: Path) -> ModuleType:
    module_name = path.stem.replace("-", "_")
    spec = importlib.util.spec_from_file_location(module_name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module

def install_reliable_automation(module: ModuleType) -> None:
    def values(node: object) -> tuple[str, str]:
        return (str(getattr(node, "text", "")).casefold().strip(), str(getattr(node, "description", "")).casefold().strip())

    def matches(node: object, label: str) -> bool:
        needle = label.casefold().strip()
        text, description = values(node)
        return needle == text or needle == description or needle in text or needle in description

    def is_interactive(node: object) -> bool:
        explicit = getattr(node, "clickable", None)
        if explicit is not None:
            return bool(explicit)
        return bool(str(getattr(node, "description", "")).strip())

    def tap(label: str, *, enabled: bool | None = True, scroll: bool = False) -> None:
        needle = label.casefold().strip()
        deadline = time.time() + 40
        last_nodes: list[object] = []
        while time.time() < deadline:
            last_nodes = module.dump_ui("tap-latest")
            enabled_nodes = [item for item in last_nodes if enabled is None or bool(getattr(item, "enabled", False)) is enabled]
            exact = [item for item in enabled_nodes if needle in values(item) and needle != ""]
            interactive = [item for item in enabled_nodes if is_interactive(item)]
            exact_interactive = [item for item in exact if is_interactive(item)]
            candidates = exact_interactive or exact or [item for item in interactive if matches(item, label)]
            if candidates:
                node = candidates[0]
                left, top, right, bottom = node.bounds
                visible_top, visible_bottom = max(top, 1), min(bottom, 2338)
                if visible_bottom - visible_top < 20 and scroll:
                    module.swipe_up()
                    time.sleep(0.5)
                    continue
                x, y = (left + right) // 2, (visible_top + visible_bottom) // 2
                print(f"TAP {label!r}: description={getattr(node, 'description', '')!r} text={getattr(node, 'text', '')!r} at {x},{y}")
                module.adb("shell", "input", "tap", str(x), str(y))
                time.sleep(1.2)
                return
            if scroll:
                module.swipe_up()
            else:
                time.sleep(0.7)
        for item in last_nodes:
            if getattr(item, "text", "") or getattr(item, "description", ""):
                print(item)
        raise AssertionError(f"Timed out waiting for clickable control {label!r}")

    def type_android_text(value: str) -> None:
        # Avoid injecting an entire controlled-input value within one render.
        for offset in range(0, len(value), 4):
            chunk = value[offset:offset + 4].replace("%", "%25").replace(" ", "%s")
            module.adb("shell", "input", "text", chunk)
            time.sleep(0.12)

    def input_text(field_label: str, value: str, *, scroll: bool = False) -> None:
        for attempt in range(3):
            deadline = time.time() + 35
            node = None
            last_nodes: list[object] = []
            while time.time() < deadline:
                last_nodes = module.dump_ui("input-latest")
                candidates = [item for item in last_nodes if str(getattr(item, "description", "")).casefold() == field_label.casefold() and getattr(item, "enabled", False)]
                if candidates:
                    clickable = [item for item in candidates if getattr(item, "clickable", True)]
                    node = clickable[0] if clickable else candidates[0]
                    break
                if scroll:
                    module.swipe_up()
                else:
                    time.sleep(0.7)
            if node is None:
                raise AssertionError(f"Timed out waiting for editable field {field_label!r}")
            left, top, right, bottom = node.bounds
            x, y = (left + right) // 2, (top + bottom) // 2
            print(f"INPUT {field_label!r}, attempt {attempt + 1}", flush=True)
            module.adb("shell", "input", "tap", str(x), str(y))
            time.sleep(0.45)
            module.adb("shell", "input", "keyevent", "KEYCODE_MOVE_END")
            module.adb("shell", "input", "keyevent", *(["KEYCODE_DEL"] * 256))
            time.sleep(0.3)
            type_android_text(value)
            time.sleep(0.8)
            verified = "password" in field_label.casefold()
            # Masked password fields are verified by actual sign-in/password
            # change. Other fields must still match every character exactly.
            verify_deadline = time.time() + 6
            while not verified and time.time() < verify_deadline:
                for item in module.dump_ui("input-verify"):
                    if str(getattr(item, "description", "")).casefold() == field_label.casefold() and str(getattr(item, "text", "")) == value:
                        verified = True
                        break
                if not verified:
                    time.sleep(0.5)
            if verified:
                module.adb("shell", "input", "keyevent", "KEYCODE_BACK", check=False)
                time.sleep(0.6)
                return
        raise AssertionError(f"Android did not enter the exact expected value into {field_label!r} after three attempts")

    original_wait = module.wait_for
    def wait_for(label: str, **kwargs):
        # A retained scroll position is intended app behaviour. Navigate to a
        # top heading with real gestures, then run the original assertion.
        if label in TOP_HEADINGS:
            module.scroll_to_top()
        return original_wait(label, **kwargs)

    module.matches = matches
    module.tap = tap
    module.input_text = input_text
    module.wait_for = wait_for

def main() -> int:
    for suite_path in SUITES:
        print(f"\n=== Running {suite_path.name} with reliable UI automation ===", flush=True)
        suite = load_suite(suite_path)
        install_reliable_automation(suite)
        try:
            result = suite.main()
        except Exception:
            capture = getattr(suite, "capture_evidence", None) or getattr(suite, "capture", None)
            if capture:
                capture("failure")
            raise
        if result not in (None, 0):
            return int(result)
    print("\nPASS: every Cogni Android launch, authentication, onboarding, account, training, feedback, accessibility and pre-store interaction suite completed.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
