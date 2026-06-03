-- Rentify AI Concierge Phase 1
-- Read-only assistant tools, optional conversation logging, and RAG-ready pgvector storage.

create extension if not exists vector;

create table if not exists public.assistant_conversations (
  id uuid primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  title text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assistant_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.assistant_conversations(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  role text not null check (role in ('user', 'assistant', 'tool', 'system')),
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists assistant_conversations_user_idx
  on public.assistant_conversations(user_id, updated_at desc);

create index if not exists assistant_messages_conversation_idx
  on public.assistant_messages(conversation_id, created_at asc);

create table if not exists public.assistant_knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  source_id text,
  title text,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  embedding vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists assistant_knowledge_embedding_idx
  on public.assistant_knowledge_documents
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create or replace function public.match_assistant_knowledge(
  query_embedding vector(1536),
  match_count int default 5,
  match_threshold float default 0.75
)
returns table (
  id uuid,
  source text,
  source_id text,
  title text,
  content text,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    id,
    source,
    source_id,
    title,
    content,
    metadata,
    1 - (embedding <=> query_embedding) as similarity
  from public.assistant_knowledge_documents
  where embedding is not null
    and 1 - (embedding <=> query_embedding) >= match_threshold
  order by embedding <=> query_embedding
  limit match_count;
$$;

alter table public.assistant_conversations enable row level security;
alter table public.assistant_messages enable row level security;
alter table public.assistant_knowledge_documents enable row level security;

-- Add RLS policies that match your Supabase auth strategy before enabling
-- client-side access. The Express backend currently accesses these tables
-- server-side through the configured Supabase client.
