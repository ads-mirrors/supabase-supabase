alter table content.error
add column id uuid unique not null default gen_random_uuid();

grant select (id)
on content.error
to anon;

grant select (id)
on content.error
to authenticated;
