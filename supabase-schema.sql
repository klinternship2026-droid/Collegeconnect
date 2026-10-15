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

create policy "Public profiles are viewable by everyone" 
  on public.profiles for select using (true);

create policy "Users can insert their own profile" 
  on public.profiles for insert with check (auth.uid() = id);

create policy "Users can update their own profile" 
  on public.profiles for update using (auth.uid() = id);

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
  date text,
  time text,
  location text,
  organizer text,
  category text,
  description text,
  image text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.events enable row level security;
create policy "Events are viewable by everyone" on public.events for select using (true);
create policy "Authenticated users can insert events" on public.events for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can update events" on public.events for update using (auth.role() = 'authenticated');
create policy "Authenticated users can delete events" on public.events for delete using (auth.role() = 'authenticated');

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
create policy "Books are viewable by everyone" on public.books for select using (true);
create policy "Authenticated users can insert books" on public.books for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can update books" on public.books for update using (auth.role() = 'authenticated');
create policy "Authenticated users can delete books" on public.books for delete using (auth.role() = 'authenticated');

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
create policy "Clubs are viewable by everyone" on public.clubs for select using (true);
create policy "Authenticated users can insert clubs" on public.clubs for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can update clubs" on public.clubs for update using (auth.role() = 'authenticated');
create policy "Authenticated users can delete clubs" on public.clubs for delete using (auth.role() = 'authenticated');

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
create policy "Photos are viewable by everyone" on public.photos for select using (true);
create policy "Authenticated users can insert photos" on public.photos for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can delete photos" on public.photos for delete using (auth.role() = 'authenticated');

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
create policy "Announcements are viewable by everyone" on public.announcements for select using (true);
create policy "Authenticated users can manage announcements" on public.announcements for all using (auth.role() = 'authenticated');

-- 7. ORDERS / BOOK RESERVATIONS TABLE
create table if not exists public.orders (
  id text primary key,
  book_id text references public.books(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  pickup_date text,
  note text,
  status text default 'Pending',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.orders enable row level security;
create policy "Users can view their own reservations" on public.orders for select using (auth.uid() = user_id or auth.role() = 'authenticated');
create policy "Users can create reservations" on public.orders for insert with check (auth.uid() = user_id);
create policy "Users can update reservations" on public.orders for update using (auth.uid() = user_id or auth.role() = 'authenticated');

-- 8. RSVPS TABLE
create table if not exists public.rsvps (
  id text primary key,
  event_id text references public.events(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  date text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.rsvps enable row level security;
create policy "RSVPs are viewable by authenticated users" on public.rsvps for select using (auth.role() = 'authenticated');
create policy "Users can manage their own RSVPs" on public.rsvps for all using (auth.uid() = user_id);

-- 9. JOIN REQUESTS TABLE
create table if not exists public.join_requests (
  id text primary key,
  club_id text references public.clubs(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  status text default 'Pending',
  date text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.join_requests enable row level security;
create policy "Join requests viewable by authenticated users" on public.join_requests for select using (auth.role() = 'authenticated');
create policy "Users can manage their own join requests" on public.join_requests for all using (auth.uid() = user_id);
