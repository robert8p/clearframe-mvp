#!/usr/bin/env python3
"""Verify reviewed application bytes and adapt only release-specific test fixtures.

No application source is modified. Test changes preserve existing assertions;
only version/copy expectations and mocks for the new provider are updated.
No network, credentials, Git writes or permission changes are used.
"""
import hashlib
import json
from pathlib import Path
root = Path(__file__).resolve().parents[2]
allowed = {
    '.github/scripts/cogni-auth-main-flow.py',
    '.github/scripts/cogni-copy-feedback-e2e.py',
    '.github/scripts/cogni-monetization-prestore-e2e.py',
    '.github/scripts/cogni-profile-password-e2e.py',
    '.github/scripts/cogni-signup-onboarding-e2e.py',
    '.github/scripts/cogni-upgrade-e2e.py',
    '.github/scripts/verify-cogni-apk-runtime.sh',
    'mobile/scripts/account-flows.test.mjs',
    'mobile/scripts/learner-journey.test.mjs',
    'mobile/scripts/monetization-audit.mjs',
    'mobile/scripts/release-contract.test.mjs',
}
manifest = json.loads((root / '.github/cogni-044-source-edits.json').read_text())
for item in manifest:
    name = item['path']
    path = (root / name).resolve()
    assert path.is_relative_to(root), 'Invalid path'
    raw = path.read_text()
    digest = hashlib.sha256(raw.encode()).hexdigest()
    if digest == item['after']:
        print('Reviewed bytes verified:', name)
        continue
    assert name in allowed, 'Application differs from reviewed source: ' + name
    assert digest == item['before'], 'Test fixture changed since review: ' + name
    for edit in sorted(item['edits'], key=lambda x: x['start'], reverse=True):
        assert 0 <= edit['start'] <= edit['end'] <= len(raw)
        raw = raw[:edit['start']] + edit['text'] + raw[edit['end']:]
    assert hashlib.sha256(raw.encode()).hexdigest() == item['after'], 'Test checksum mismatch'
    path.write_text(raw)
    print('Version-matched test fixture:', name)
