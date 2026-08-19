create type public.risk_level as enum ('low', 'medium', 'high');
create type public.client_status as enum ('active', 'inactive', 'churn');
create type public.contract_type as enum ('recurring', 'one-off');

create table public.clients (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    cnpj_cpf text,
    address text,
    country text default 'Brasil',
    state text,
    city text,
    corporate_email text,
    contact_name text,
    contact_whatsapp text,
    squad_id uuid references public.squads(id) on delete set null,
    segment text,
    start_date date not null default current_date,
    end_date_expected date,
    scope_details text,
    extra_comments text,
    health_score integer default 100 check (health_score >= 0 and health_score <= 100),
    status public.client_status default 'active',
    risk_level public.risk_level default 'low',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.contracts (
    id uuid primary key default gen_random_uuid(),
    client_id uuid references public.clients(id) on delete cascade not null,
    contract_number text unique,
    type public.contract_type not null default 'recurring',
    monthly_value decimal(12, 2) default 0.00,
    total_value decimal(12, 2) default 0.00,
    start_date date not null default current_date,
    renewal_date date,
    auto_renewal boolean default true,
    status text default 'active',
    payment_method text,
    payment_day integer check (payment_day >= 1 and payment_day <= 31),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table public.clients enable row level security;
alter table public.contracts enable row level security;

-- Grants
grant select, insert, update, delete on public.clients to authenticated;
grant all on public.clients to service_role;

grant select, insert, update, delete on public.contracts to authenticated;
grant all on public.contracts to service_role;

-- Policies
create policy "Authenticated users can select clients" on public.clients for select to authenticated using (true);
create policy "Authenticated users can insert clients" on public.clients for insert to authenticated with check (true);
create policy "Authenticated users can update clients" on public.clients for update to authenticated using (true);

create policy "Authenticated users can select contracts" on public.contracts for select to authenticated using (true);
create policy "Authenticated users can insert contracts" on public.contracts for insert to authenticated with check (true);
create policy "Authenticated users can update contracts" on public.contracts for update to authenticated using (true);
