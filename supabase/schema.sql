-- WHYRO initial schema for Supabase PostgreSQL.
-- Run in Supabase SQL Editor after creating a project.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default 'WHYRO member',
  avatar_url text,
  bio text,
  role text not null default 'member' check (role in ('member','team','admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 90),
  description text not null check (char_length(description) between 20 and 1000),
  category text not null default 'Other',
  technologies text[] not null default '{}',
  url text,
  status text not null default 'published' check (status in ('draft','published','hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contributor_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  name text not null check (char_length(name) between 1 and 100),
  email text not null check (char_length(email) between 3 and 254),
  area text not null default 'Other',
  message text not null check (char_length(message) between 20 and 1500),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.contributor_applications enable row level security;

create policy "Profiles are publicly readable" on public.profiles for select using (true);
create policy "Users can create their own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "Users can update their own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create policy "Published projects are publicly readable" on public.projects for select using (status = 'published' or owner_id = auth.uid());
create policy "Authenticated users can publish projects as themselves" on public.projects for insert to authenticated with check (auth.uid() = owner_id);
create policy "Owners can update their own projects" on public.projects for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Owners can delete their own projects" on public.projects for delete to authenticated using (auth.uid() = owner_id);

create policy "Visitors can submit contributor applications" on public.contributor_applications for insert with check (user_id is null or user_id = auth.uid());
-- Do not create public SELECT policies for applications. Admin review must use a secure server-side workflow.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1), 'WHYRO member'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

-- IMPORTANT:
-- Configure Google OAuth in Supabase Auth and your Google Cloud OAuth client.
-- Set up an Edge Function using server-side secrets to email contributor applications.
-- Never put a service-role key or email-provider secret in VITE_* browser variables.
