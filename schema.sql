-- ============================================
-- SakuKita - Supabase Database Schema
-- Jalankan di: Supabase Dashboard → SQL Editor
-- ============================================

-- 1. Tabel Profiles (terhubung ke Supabase Auth)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  created_at timestamptz default now()
);

-- 2. Tabel Transactions
create table if not exists transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  type text not null check (type in ('income', 'expense')),
  amount numeric not null check (amount > 0),
  description text,
  date date not null,
  created_at timestamptz default now()
);

-- 3. Aktifkan Row Level Security
alter table profiles enable row level security;
alter table transactions enable row level security;

-- 4. RLS Policies - Profiles
create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on profiles for insert
  with check (auth.uid() = id);

-- 5. RLS Policies - Transactions
create policy "Users can view own transactions"
  on transactions for select
  using (auth.uid() = user_id);

create policy "Users can insert own transactions"
  on transactions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own transactions"
  on transactions for update
  using (auth.uid() = user_id);

create policy "Users can delete own transactions"
  on transactions for delete
  using (auth.uid() = user_id);

-- 6. Index untuk performa query
create index if not exists idx_transactions_user_id on transactions(user_id);
create index if not exists idx_transactions_date on transactions(date);
create index if not exists idx_transactions_user_date on transactions(user_id, date);
