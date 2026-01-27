-- Create a table for public profiles using Supabase Auth
create table profiles (
  id uuid references auth.users not null primary key,
  updated_at timestamp with time zone,
  username text unique,
  full_name text,
  avatar_url text,
  website text,

  constraint username_length check (char_length(username) >= 3)
);

-- Set up Row Level Security (RLS)
alter table profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- Create a table for Chat Rooms
create table chats (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text, -- For group chats
  is_group boolean default false
);

alter table chats enable row level security;

create policy "Chats are viewable by participants."
  on chats for select
  using (
    exists (
      select 1 from chat_participants
      where chat_id = chats.id and user_id = auth.uid()
    )
  );

create policy "Users can create chats."
  on chats for insert
  with check (true);


-- Create table to link Users to Chats (Many-to-Many)
create table chat_participants (
  chat_id uuid references chats(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (chat_id, user_id)
);

alter table chat_participants enable row level security;

create policy "Participants are viewable by other participants in the same chat."
  on chat_participants for select
  using (
    exists (
      select 1 from chat_participants as cp
      where cp.chat_id = chat_participants.chat_id and cp.user_id = auth.uid()
    )
  );

create policy "Users can join chats."
  on chat_participants for insert
  with check (auth.uid() = user_id); 


-- Create table for Messages
create table messages (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  chat_id uuid references chats(id) on delete cascade not null,
  sender_id uuid references profiles(id) not null,
  content text,
  type text default 'text' check (type in ('text', 'image', 'video', 'audio', 'file')),
  media_url text
);

alter table messages enable row level security;

create policy "Messages are viewable by chat participants."
  on messages for select
  using (
    exists (
      select 1 from chat_participants
      where chat_id = messages.chat_id and user_id = auth.uid()
    )
  );

create policy "Users can insert messages in chats they belong to."
  on messages for insert
  with check (
    auth.uid() = sender_id and
    exists (
      select 1 from chat_participants
      where chat_id = messages.chat_id and user_id = auth.uid()
    )
  );

-- Function to handle new user creation automatically
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url, username)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', new.email);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call the function on new user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Enable Storage for Media
insert into storage.buckets (id, name)
values ('media', 'media');

create policy "Media is publicly accessible."
  on storage.objects for select
  using ( bucket_id = 'media' );

create policy "Users can upload media."
  on storage.objects for insert
  with check ( bucket_id = 'media' and auth.uid() = owner );
