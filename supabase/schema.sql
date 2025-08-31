-- Supabase schema for Kanban PWA
create table if not exists funnels (
  id text primary key,
  name text not null,
  order_index int not null default 0
);

create table if not exists groups (
  id text primary key,
  funnel_id text references funnels(id) on delete cascade,
  name text not null,
  description text,
  mode text check (mode in ('manual','auto')) default 'manual',
  color text,
  order_index int not null default 0
);

create table if not exists cards (
  id text primary key,
  group_id text references groups(id) on delete cascade,
  name text not null,
  summary text,
  assignee text,
  pinned boolean default false,
  minutes_ago int,
  statuses text[] default '{}',
  tags text[] default '{}',
  order_index int not null default 0
);

-- Enable RLS
alter table funnels enable row level security;
alter table groups enable row level security;
alter table cards enable row level security;

-- Public read, authenticated write (adjust to your needs)
create policy funnels_read on funnels for select using (true);
create policy groups_read on groups for select using (true);
create policy cards_read on cards for select using (true);

create policy funnels_write on funnels for insert with check (auth.role() = 'authenticated');
create policy funnels_update on funnels for update using (auth.role() = 'authenticated');
create policy funnels_delete on funnels for delete using (auth.role() = 'authenticated');

create policy groups_write on groups for insert with check (auth.role() = 'authenticated');
create policy groups_update on groups for update using (auth.role() = 'authenticated');
create policy groups_delete on groups for delete using (auth.role() = 'authenticated');

create policy cards_write on cards for insert with check (auth.role() = 'authenticated');
create policy cards_update on cards for update using (auth.role() = 'authenticated');
create policy cards_delete on cards for delete using (auth.role() = 'authenticated');

