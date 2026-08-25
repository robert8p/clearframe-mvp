#!/usr/bin/env python3
"""Run Cogni Android E2E suites with reliable labelled-field input targeting."""

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


def install_reliable_input(module: ModuleType) -> None:
    def input_text(field_label: str, value: str, *, scroll: bool = False) -> None:
        deadline = time.time() + 35
        node = None
        last_nodes = []
        while time.time() < deadline:
            last_nodes = module.dump_ui("input-latest")
            candidates = [
                item
                for item in last_nodes
                if getattr(item, "description", "") == field_label
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

        left, top, right, bottom = node.bounds
        x = (left + right) // 2
        y = (top + bottom) // 2
        print(
            f"INPUT {field_label!r}: description={getattr(node, 'description', '')!r} "
            f"text={getattr(node, 'text', '')!r} at {x},{y}"
        )
        module.adb("shell", "input", "tap", str(x), str(y))
        time.sleep(0.4)
        module.adb("shell", "input", "keyevent", "KEYCODE_MOVE_END", check=False)
        escaped = value.replace("%", "%25").replace(" ", "%s")
        module.adb("shell", "input", "text", escaped)
        time.sleep(0.8)

        # Android deliberately hides secure-field content from UI automation.
        # For ordinary text fields, verify the labelled editable node changed.
        if "password" in field_label.lower():
            return

        verified = False
        verify_deadline = time.time() + 6
        while time.time() < verify_deadline:
            for item in module.dump_ui("input-verify"):
                if getattr(item, "description", "") == field_label:
                    observed = getattr(item, "text", "")
                    if observed and observed != field_label:
                        verified = True
                        break
            if verified:
                break
            time.sleep(0.5)
        if not verified:
            raise AssertionError(f"Android did not enter text into {field_label!r}")

    module.input_text = input_text


for suite_path in SUITES:
    print(f"\n=== Running {suite_path.name} with reliable field targeting ===", flush=True)
    suite = load_suite(suite_path)
    install_reliable_input(suite)
    result = suite.main()
    if result not in (None, 0):
        raise SystemExit(int(result))

print("\nPASS: every Cogni Android launch, authentication, onboarding, account and tab interaction suite completed.")
