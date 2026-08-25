#!/usr/bin/env python3
"""Run the complete Android launch/auth/account suite with reliable field input."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

runner = Path(__file__).resolve().with_name("cogni-auth-route-e2e-fixed.py")
result = subprocess.run([sys.executable, str(runner)], env=os.environ.copy(), check=False)
raise SystemExit(result.returncode)
