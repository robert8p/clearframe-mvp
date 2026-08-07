from pathlib import Path
s=Path('supabase/migrations/002_seed.sql').read_text()
assert s.count('insert into public.challenges(')==100
assert s.count('ai_answer_audit')>=25
assert s.count('bias_spotting')>=10
print('Seed QA passed: 100 challenges, AI-audit and bias minimums met.')
