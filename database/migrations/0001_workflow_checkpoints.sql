-- EAP 2.5: estrutura de checkpoints no Supabase/PostgreSQL.
-- Não executada em banco real. Aplicar apenas em projeto dedicado VÉRTICE ONE.
create extension if not exists pgcrypto;

create table if not exists public.vertice_workflow_checkpoints (
  tenant_id uuid not null,
  workflow_id text not null,
  version bigint not null check (version >= 1),
  state jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, workflow_id),
  constraint workflow_nonempty check (length(workflow_id) > 0)
);

create table if not exists public.vertice_workflow_events (
  tenant_id uuid not null,
  workflow_id text not null,
  event_id text not null,
  version bigint not null check (version >= 2),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  primary key (tenant_id, workflow_id, event_id),
  unique (tenant_id, workflow_id, version),
  foreign key (tenant_id, workflow_id)
    references public.vertice_workflow_checkpoints (tenant_id, workflow_id)
    on delete cascade
);

create index if not exists vertice_events_lookup_idx
  on public.vertice_workflow_events (tenant_id, workflow_id, created_at);

alter table public.vertice_workflow_checkpoints enable row level security;
alter table public.vertice_workflow_events enable row level security;
revoke all on public.vertice_workflow_checkpoints from anon, authenticated;
revoke all on public.vertice_workflow_events from anon, authenticated;

-- Nenhuma política para anon/authenticated: negação por padrão.
-- Backend de confiança deve aplicar autorização por tenant e realizar em
-- UMA transação: SELECT ... FOR UPDATE, checagem de versão, inserção de
-- evento com idempotência e atualização do checkpoint.
-- Jamais expor service_role ao navegador.
