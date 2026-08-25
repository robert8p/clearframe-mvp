#!/usr/bin/env python3
"""Run every Android authentication, onboarding and account-route interaction suite."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SUITES = [
    ROOT / "cogni-auth-main-flow.py",
    ROOT / "cogni-profile-password-e2e.py",
    ROOT / "cogni-signup-onboarding-e2e.py",
]

for suite in SUITES:
    print(f"\n=== Running {suite.name} ===", flush=True)
    result = subprocess.run([sys.executable, str(suite)], env=os.environ.copy(), check=False)
    if result.returncode != 0:
        raise SystemExit(result.returncode)

print("\nPASS: all Cogni Android launch, authentication, onboarding, account and tab interaction suites completed.")
