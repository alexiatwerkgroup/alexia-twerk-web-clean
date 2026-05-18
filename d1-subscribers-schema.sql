-- TWERKHUB · subscribers table for Cloudflare D1
-- Run ONCE in: dash.cloudflare.com → Workers & Pages → D1 → twerkhub-subscribers → Console

create table if not exists subscribers (
  id integer primary key autoincrement,
  email text unique not null,
  source text default 'home_modal',
  created_at integer default (unixepoch()) not null,
  ip text,
  user_agent text,
  confirmed integer default 0,
  unsubscribed_at integer
);

create index if not exists subscribers_email_idx on subscribers (email);
create index if not exists subscribers_created_at_idx on subscribers (created_at desc);
create index if not exists subscribers_source_idx on subscribers (source);
