-- Final plain-language cleanup for two legacy content strings missed by the general refresh.
update public.challenge_answer_keys
set explanation='Tracing the number to its original source and checking it against that source matter more than cosmetic signs of precision.'
where challenge_id='cfcc0c1e-a03b-517b-938a-b2c6ed27175a';

update public.challenges
set prompt='An AI output could influence a £500k team investment proposal. Which control approach is strongest given the people affected, the budget, delivery risk and possible knock-on effects?',
    updated_at=now()
where id='05c243b0-12dc-579b-9c39-7f77f625fd3e';
