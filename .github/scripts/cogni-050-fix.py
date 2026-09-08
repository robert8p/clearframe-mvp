# Idempotent compatibility repair for the Cogni 0.5.0 visual release.
from pathlib import Path

root=Path(__file__).resolve().parents[2]
def patch(rel, replacements):
    p=root/rel; s=p.read_text(); before=s
    for old,new in replacements:
        if old in s: s=s.replace(old,new)
        elif new not in s: raise SystemExit(f'Expected source text missing in {rel}: {old}')
    if s!=before: p.write_text(s)

patch('mobile/lib/theme.ts',[
 ('  bgDeep: "#040916",\n  bgRaised: "#0b1730",','  bgDeep: "#040916",\n  bg2: "#0B1730",\n  bgRaised: "#0B1730",'),
 ('  lineStrong: "rgba(174,201,239,.34)",','  lineStrong: "#7891BA",'),
])
patch('mobile/components/ui.tsx',[
 ('minHeight:54,paddingHorizontal:20','minHeight: 56,paddingHorizontal:20'),
 ('minHeight:54,borderRadius:radius.pill','minHeight: 56,borderRadius:radius.pill'),
 ('minHeight:44,minWidth:44','minHeight: 48,minWidth:48'),
])
for rel in ['mobile/components/practice-tools.tsx','mobile/components/question-runner.tsx','mobile/app/(tabs)/skills.tsx']:
    patch(rel,[('minHeight:44','minHeight:48')])
patch('mobile/app/onboarding.tsx', [('selectedAudience==="casual"','selectedAudience === "casual"')])
patch('mobile/app/(tabs)/_layout.tsx', [('tabBarHideOnKeyboard:true','tabBarHideOnKeyboard: true')])
old=root/'.github/workflows/cogni-050-release.yml'
if old.exists(): old.unlink()
