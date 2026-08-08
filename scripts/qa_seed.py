from pathlib import Path
import re
from collections import Counter

seed = Path('supabase/migrations/002_seed.sql').read_text()
formats = Path('supabase/migrations/005_learning_formats_and_lessons.sql').read_text()

assert seed.count('insert into public.challenges(') == 100
assert seed.count('ai_answer_audit') >= 25
assert seed.count('bias_spotting') >= 10

positions = [int(value) for value in re.findall(
    r"challenge_answer_keys\(challenge_id,correct_index,explanation,thinking_principle,application,error_patterns\) values \('[^']+',([0-3]),",
    seed,
)]
assert len(positions) == 100, f'Expected 100 legacy MCQ keys, got {len(positions)}'
counts = Counter(positions)
assert counts == Counter({0: 25, 1: 25, 2: 25, 3: 25}), f'Unbalanced legacy answer positions: {counts}'

assert formats.count('insert into public.daily_lessons(') == 15
assert formats.count('insert into public.challenges(') == 50
interaction_counts = Counter()
for line in formats.splitlines():
    if line.startswith('insert into public.challenges('):
        for interaction in ('multi_select', 'ranking', 'classification', 'triage', 'single_choice'):
            if f"'{interaction}'" in line:
                interaction_counts[interaction] += 1
                break
assert interaction_counts['multi_select'] == 8
assert interaction_counts['ranking'] == 8
assert interaction_counts['classification'] == 8
assert interaction_counts['triage'] == 6
assert interaction_counts['single_choice'] == 20

story_positions = [int(value) for value in re.findall(
    r"challenge_answer_keys\(challenge_id,correct_index,correct_answer,explanation,thinking_principle,application,error_patterns\) values \('[^']+',([0-3]),to_jsonb\([0-3]\)",
    formats,
)][-20:]
assert Counter(story_positions) == Counter({0: 5, 1: 5, 2: 5, 3: 5}), f'Unbalanced story MCQs: {Counter(story_positions)}'

print('Seed QA passed: 120 balanced MCQs, 15 lessons, 30 alternative-format challenges.')
