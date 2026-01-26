-- Create or update owner_profiles table
create table if not exists public.owner_profiles (
  id uuid not null default auth.uid() primary key references auth.users(id),
  business_name text,
  phone text,
  email text,
  address text,
  bank_name text,
  account_title text,
  account_number text,
  iban text,
  invoice_prefix text default 'INV',
  next_invoice_number bigint default 1,
  default_payment_terms integer default 7,
  default_tax_rate numeric(5,2) default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on RLS
alter table public.owner_profiles enable row level security;

-- Policies
create policy "Users can view their own profile" 
on public.owner_profiles for select 
using ( auth.uid() = id );

-- Allow public read access to business profiles (for Contact page)
create policy "Public can view business profiles" 
on public.owner_profiles for select 
using ( true );

create policy "Users can update their own profile" 
on public.owner_profiles for update 
using ( auth.uid() = id );

create policy "Users can insert their own profile" 
on public.owner_profiles for insert 
with check ( auth.uid() = id );

-- Create trigger to automatically create profile on signup
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.owner_profiles (id, business_name, email)
  values (new.id, 'MI Printers', new.email);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger the function every time a user is created
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Grant permissions (if needed for anon access to public contact info, might need to adjust RLS or create a secure RPC)
-- For now, contact page uses localStorage which is synced via Owner Login. 
-- To allow public access to contact info, we might need a separate mechanism or "public" view, 
-- but simpler to just sync to localStorage on login/sync for now.
