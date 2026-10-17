-- ========================================================
-- CollegeConnect Supabase Database Schema & RLS Policies
-- Run this in your Supabase SQL Editor:
-- Dashboard > SQL Editor > New query > Paste & Run
-- ========================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text default '',
  role text default 'student' check (role in ('student', 'leader', 'admin')),
  avatar_url text default '',
  student_id text default '',
  faculty text default '',
  year text default '',
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Profiles RLS
alter table public.profiles enable row level security;

drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
create policy "Public profiles are viewable by everyone" 
  on public.profiles for select using (true);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile" 
  on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Profiles update policy" on public.profiles;
create policy "Profiles update policy" 
  on public.profiles for update using (true) with check (true);

-- Auto-create profile trigger on sign up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), 'student')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. EVENTS TABLE
create table if not exists public.events (
  id text primary key,
  title text not null,
  event_date text,
  event_time text,
  location text,
  organizer text,
  category text,
  description text,
  image_url text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Ensure alternative column names exist if table already existed
alter table public.events add column if not exists event_date text;
alter table public.events add column if not exists event_time text;
alter table public.events add column if not exists image_url text;
alter table public.events add column if not exists date text;
alter table public.events add column if not exists time text;
alter table public.events add column if not exists image text;

alter table public.events enable row level security;
drop policy if exists "Events are viewable by everyone" on public.events;
create policy "Events are viewable by everyone" on public.events for select using (true);

drop policy if exists "Events modifications" on public.events;
create policy "Events modifications" on public.events for all using (true) with check (true);

-- 3. BOOKS TABLE
create table if not exists public.books (
  id text primary key,
  title text not null,
  author text,
  category text,
  availability text default 'Available',
  cover text,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.books enable row level security;
drop policy if exists "Books are viewable by everyone" on public.books;
create policy "Books are viewable by everyone" on public.books for select using (true);

drop policy if exists "Books modifications" on public.books;
create policy "Books modifications" on public.books for all using (true) with check (true);

-- 4. CLUBS TABLE
create table if not exists public.clubs (
  id text primary key,
  name text not null,
  icon text,
  category text,
  description text,
  meeting text,
  contact text,
  activities jsonb default '[]'::jsonb,
  leader_id text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.clubs enable row level security;
drop policy if exists "Clubs are viewable by everyone" on public.clubs;
create policy "Clubs are viewable by everyone" on public.clubs for select using (true);

drop policy if exists "Clubs modifications" on public.clubs;
create policy "Clubs modifications" on public.clubs for all using (true) with check (true);

-- 5. PHOTOS / GALLERY TABLE
create table if not exists public.photos (
  id text primary key,
  title text not null,
  caption text,
  category text,
  album text,
  image text not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.photos enable row level security;
drop policy if exists "Photos are viewable by everyone" on public.photos;
create policy "Photos are viewable by everyone" on public.photos for select using (true);

drop policy if exists "Photos modifications" on public.photos;
create policy "Photos modifications" on public.photos for all using (true) with check (true);

-- 6. ANNOUNCEMENTS TABLE
create table if not exists public.announcements (
  id text primary key,
  title text not null,
  message text not null,
  date text,
  active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.announcements enable row level security;
drop policy if exists "Announcements are viewable by everyone" on public.announcements;
create policy "Announcements are viewable by everyone" on public.announcements for select using (true);

drop policy if exists "Announcements modifications" on public.announcements;
create policy "Announcements modifications" on public.announcements for all using (true) with check (true);

-- 7. ORDERS / BOOK RESERVATIONS TABLE
create table if not exists public.orders (
  id text primary key,
  book_id text,
  user_id text,
  pickup_date text,
  note text,
  status text default 'Pending',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.orders enable row level security;
drop policy if exists "Users can view their own reservations" on public.orders;
drop policy if exists "Users can create reservations" on public.orders;
drop policy if exists "Users can update reservations" on public.orders;
drop policy if exists "Orders viewable by everyone" on public.orders;
create policy "Orders viewable by everyone" on public.orders for select using (true);

drop policy if exists "Orders modifications" on public.orders;
create policy "Orders modifications" on public.orders for all using (true) with check (true);

-- 8. RSVPS TABLE
create table if not exists public.rsvps (
  id text primary key,
  event_id text,
  user_id text,
  date text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.rsvps enable row level security;
drop policy if exists "RSVPs are viewable by authenticated users" on public.rsvps;
drop policy if exists "Users can manage their own RSVPs" on public.rsvps;
drop policy if exists "RSVPs viewable by everyone" on public.rsvps;
create policy "RSVPs viewable by everyone" on public.rsvps for select using (true);

drop policy if exists "RSVPs modifications" on public.rsvps;
create policy "RSVPs modifications" on public.rsvps for all using (true) with check (true);

-- 9. JOIN REQUESTS TABLE
create table if not exists public.join_requests (
  id text primary key,
  club_id text,
  user_id text,
  status text default 'Pending',
  date text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.join_requests enable row level security;
drop policy if exists "Join requests viewable by authenticated users" on public.join_requests;
drop policy if exists "Users can manage their own join requests" on public.join_requests;
drop policy if exists "Join requests viewable by everyone" on public.join_requests;
create policy "Join requests viewable by everyone" on public.join_requests for select using (true);

drop policy if exists "Join requests modifications" on public.join_requests;
create policy "Join requests modifications" on public.join_requests for all using (true) with check (true);

-- 10. SITE CONTENT TABLE (Centralized cross-device synchronization)
create table if not exists public.site_content (
  content_key text primary key,
  payload jsonb default '[]'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.site_content enable row level security;
drop policy if exists "Site content is viewable by everyone" on public.site_content;
create policy "Site content is viewable by everyone" on public.site_content for select using (true);

drop policy if exists "Site content modifications" on public.site_content;
create policy "Site content modifications" on public.site_content for all using (true) with check (true);

-- 11. STORAGE BUCKET (collegeconnect-media)
-- Creates the bucket if it does not already exist:
insert into storage.buckets (id, name, public)
values ('collegeconnect-media', 'collegeconnect-media', true)
on conflict (id) do update set public = true;

-- Storage bucket RLS policies for collegeconnect-media
drop policy if exists "Public media view" on storage.objects;
create policy "Public media view" on storage.objects
  for select using (bucket_id = 'collegeconnect-media');

drop policy if exists "Media upload allow" on storage.objects;
create policy "Media upload allow" on storage.objects
  for insert with check (bucket_id = 'collegeconnect-media');

drop policy if exists "Media update allow" on storage.objects;
create policy "Media update allow" on storage.objects
  for update using (bucket_id = 'collegeconnect-media');
