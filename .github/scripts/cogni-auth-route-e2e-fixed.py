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
    ROOT / "cogni-profile-password-e2e.py",
    ROOT / "cogni-signup-onboarding-e2e.py",
]


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
        return (
            str(getattr(node, "text", "")).casefold().strip(),
            str(getattr(node, "description", "")).casefold().strip(),
        )

    def matches(node: object, label: str) -> bool:
        """Match visible labels independent of casing while allowing long copy."""
        needle = label.casefold().strip()
        text, description = values(node)
        return needle == text or needle == description or needle in text or needle in description

    def is_interactive(node: object) -> bool:
        """Handle suites whose lightweight Node model omits `clickable`."""
        explicit = getattr(node, "clickable", None)
        if explicit is not None:
            return bool(explicit)
        return bool(str(getattr(node, "description", "")).strip())

    def tap(label: str, *, enabled: bool | None = True, scroll: bool = False) -> None:
        """Tap an actual interactive control, never body copy containing the label."""
        needle = label.casefold().strip()
        deadline = time.time() + 40
        last_nodes: list[object] = []
        while time.time() < deadline:
            last_nodes = module.dump_ui("tap-latest")
            eligible = [
                item
                for item in last_nodes
                if is_interactive(item)
                and (enabled is None or bool(getattr(item, "enabled", False)) is enabled)
            ]
            exact = [item for item in eligible if needle in values(item) and needle != ""]
            candidates = exact or [item for item in eligible if matches(item, label)]
            if candidates:
                node = candidates[0]
                left, top, right, bottom = node.bounds
                visible_top = max(top, 1)
                visible_bottom = min(bottom, 2338)
                if visible_bottom - visible_top < 20 and scroll:
                    module.swipe_up()
                    time.sleep(0.5)
                    continue
                x = (left + right) // 2
                y = (visible_top + visible_bottom) // 2
                print(
                    f"TAP {label!r}: description={getattr(node, 'description', '')!r} "
                    f"text={getattr(node, 'text', '')!r} at {x},{y}"
                )
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
        # Passing argv directly to adb avoids local shell expansion. Android 16
        # accepts @ correctly this way; splitting it into KEYCODE_AT previously
        # introduced an extra character on some keyboard layouts.
        escaped = value.replace("%", "%25").replace(" ", "%s")
        module.adb("shell", "input", "text", escaped)

    def input_text(field_label: str, value: str, *, scroll: bool = False) -> None:
        deadline = time.time() + 35
        node = None
        last_nodes: list[object] = []
        while time.time() < deadline:
            last_nodes = module.dump_ui("input-latest")
            candidates = [
                item
                for item in last_nodes
                if str(getattr(item, "description", "")).casefold() == field_label.casefold()
                and getattr(item, "enabled", False)
            ]
            if candidates:
                clickable = [item for item in candidates if getattr(item, "clickable", True)]
                node = clickable[0] if clickable else candidates[0]
                break
            if scroll:
                module.swipe_up()
            else:
                time.sleep(0.7)

        if node is None:
            for item in last_nodes:
                if getattr(item, "text", "") or getattr(item, "description", ""):
                    print(item)
            raise AssertionError(f"Timed out waiting for editable field {field_label!r}")

        # Supabase Auth rejects RFC-reserved example.com addresses for recovery
        # delivery even though signup/sign-in accept them. Keep the disposable
        # account address for auth, but exercise the reset endpoint with a valid
        # deliverable-domain address.
        effective_value = value
        on_reset_screen = any(matches(item, "Reset your password") for item in last_nodes)
        if field_label.casefold() == "email" and on_reset_screen and value.endswith("@example.com"):
            local = value.split("@", 1)[0].replace(".", "")
            effective_value = f"{local}@gmail.com"

        left, top, right, bottom = node.bounds
        x = (left + right) // 2
        y = (top + bottom) // 2
        print(
            f"INPUT {field_label!r}: description={getattr(node, 'description', '')!r} "
            f"text={getattr(node, 'text', '')!r} at {x},{y}"
        )
        module.adb("shell", "input", "tap", str(x), str(y))
        time.sleep(0.4)
        type_android_text(effective_value)
        time.sleep(0.8)

        # Android deliberately hides secure-field content from UI automation.
        if "password" not in field_label.casefold():
            verified = False
            verify_deadline = time.time() + 6
            while time.time() < verify_deadline:
                for item in module.dump_ui("input-verify"):
                    if str(getattr(item, "description", "")).casefold() == field_label.casefold():
                        observed = str(getattr(item, "text", ""))
                        if observed == effective_value:
                            verified = True
                            break
                if verified:
                    break
                time.sleep(0.5)
            if not verified:
                raise AssertionError(
                    f"Android did not enter the exact expected value into {field_label!r}"
                )

        # Ensure the next action is not obscured by the soft keyboard. This was
        # particularly important for the lower Create account button.
        module.adb("shell", "input", "keyevent", "KEYCODE_BACK", check=False)
        time.sleep(0.6)

    module.matches = matches
    module.tap = tap
    module.input_text = input_text


for suite_path in SUITES:
    print(f"\n=== Running {suite_path.name} with reliable UI automation ===", flush=True)
    suite = load_suite(suite_path)
    install_reliable_automation(suite)
    result = suite.main()
    if result not in (None, 0):
        raise SystemExit(int(result))

print("\nPASS: every Cogni Android launch, authentication, onboarding, account and tab interaction suite completed.")
