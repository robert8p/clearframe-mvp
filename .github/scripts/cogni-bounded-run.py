#!/usr/bin/env python3
"""Run an existing Python UI suite with bounded device calls; no assertions skipped."""
import os
import runpy
import subprocess
import sys
from pathlib import Path

ALLOWED = {
    'cogni-upgrade-e2e.py',
    'cogni-auth-route-e2e-fixed.py',
    'cogni-044-tools-e2e.py',
    'cogni-045-visual-e2e.py',
}
if len(sys.argv) != 2 or sys.argv[1] not in ALLOWED:
    raise SystemExit('Pass one of the tracked Cogni UI suite filenames.')
root = Path(__file__).resolve().parent
suite = root / sys.argv[1]
assert suite.is_file() and not suite.is_symlink()
original_run = subprocess.run

def bounded_run(*args, **kwargs):
    command = args[0] if args else kwargs.get('args')
    if isinstance(command, (list, tuple)) and command and Path(str(command[0])).name == 'adb':
        limit = 180 if 'install' in command else 40
        kwargs['timeout'] = min(kwargs.get('timeout') or limit, limit)
    return original_run(*args, **kwargs)

subprocess.run = bounded_run
out = Path('/tmp/cogni-045-bounded'); out.mkdir(exist_ok=True)
stream = (out / (suite.stem + '-device-stream.txt')).open('wb')
logger = subprocess.Popen(['adb', 'logcat', '-v', 'threadtime'], stdout=stream, stderr=subprocess.STDOUT)
try:
    sys.argv = [str(suite)]
    runpy.run_path(str(suite), run_name='__main__')
finally:
    logger.terminate()
    try: logger.wait(timeout=5)
    except subprocess.TimeoutExpired: logger.kill()
    stream.close()
    # Do not retain disposable account credentials in diagnostic text exports.
    raw = (out / (suite.stem + '-device-stream.txt')).read_text(errors='replace')
    for value in [os.environ.get('E2E_EMAIL'), os.environ.get('E2E_PASSWORD')]:
        if value: raw = raw.replace(value, '[REDACTED_TEST_CREDENTIAL]')
    (out / (suite.stem + '-device-stream.txt')).write_text(raw)
