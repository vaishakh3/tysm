alter table public.feedback_responses
  alter column enjoyed drop not null,
  alter column improve drop not null;

alter table public.feedback_responses
  drop constraint if exists feedback_responses_enjoyed_check,
  drop constraint if exists feedback_responses_improve_check;

alter table public.feedback_responses
  add constraint feedback_responses_enjoyed_check
    check (enjoyed is null or char_length(enjoyed) <= 1600),
  add constraint feedback_responses_improve_check
    check (improve is null or char_length(improve) <= 1600);
