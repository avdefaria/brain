-- Create a trigger function to assign 'admin' role to the first user
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger AS $body$
BEGIN
    IF (SELECT count(*) FROM public.user_roles) = 0 THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (new.id, 'admin');
    ELSE
        INSERT INTO public.user_roles (user_id, role)
        VALUES (new.id, 'collaborator');
    END IF;
    RETURN new;
END;
$body$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created_role
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- Insert Squads
INSERT INTO public.squads (name, description)
SELECT 'Squad Alpha', 'Foco em Design e UX'
WHERE NOT EXISTS (SELECT 1 FROM public.squads WHERE name = 'Squad Alpha');

INSERT INTO public.squads (name, description)
SELECT 'Squad Beta', 'Foco em Performance e Ads'
WHERE NOT EXISTS (SELECT 1 FROM public.squads WHERE name = 'Squad Beta');

-- Insert Clients
INSERT INTO public.clients (name, segment, status, risk_level)
SELECT 'TechFlow Systems', 'Tecnologia', 'active', 'low'
WHERE NOT EXISTS (SELECT 1 FROM public.clients WHERE name = 'TechFlow Systems');

INSERT INTO public.clients (name, segment, status, risk_level)
SELECT 'Global Logistics', 'Transporte', 'active', 'medium'
WHERE NOT EXISTS (SELECT 1 FROM public.clients WHERE name = 'Global Logistics');

INSERT INTO public.clients (name, segment, status, risk_level)
SELECT 'Urban Eats', 'Alimentação', 'active', 'high'
WHERE NOT EXISTS (SELECT 1 FROM public.clients WHERE name = 'Urban Eats');

-- Insert Contracts for these clients
DO $do$
DECLARE
    client1_id uuid;
    client2_id uuid;
    client3_id uuid;
BEGIN
    SELECT id INTO client1_id FROM public.clients WHERE name = 'TechFlow Systems';
    SELECT id INTO client2_id FROM public.clients WHERE name = 'Global Logistics';
    SELECT id INTO client3_id FROM public.clients WHERE name = 'Urban Eats';

    IF client1_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.contracts WHERE client_id = client1_id) THEN
        INSERT INTO public.contracts (client_id, type, total_value, status, start_date) 
        VALUES (client1_id, 'recurring', 5000, 'active', now());
    END IF;

    IF client2_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.contracts WHERE client_id = client2_id) THEN
        INSERT INTO public.contracts (client_id, type, total_value, status, start_date) 
        VALUES (client2_id, 'one-off', 12000, 'active', now());
    END IF;

    IF client3_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.contracts WHERE client_id = client3_id) THEN
        INSERT INTO public.contracts (client_id, type, total_value, status, start_date) 
        VALUES (client3_id, 'recurring', 3500, 'active', now());
    END IF;

    -- Insert Tasks
    IF client1_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.tasks WHERE client_id = client1_id AND title = 'Setup de Analytics') THEN
        INSERT INTO public.tasks (title, client_id, priority, stage, position) VALUES 
        ('Setup de Analytics', client1_id, 'high', 'todo', 0),
        ('Design da Home', client1_id, 'medium', 'doing', 0),
        ('Integração API CRM', client1_id, 'high', 'doing', 1);
    END IF;

    IF client2_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.tasks WHERE client_id = client2_id AND title = 'Revisão de Copy') THEN
        INSERT INTO public.tasks (title, client_id, priority, stage, position) VALUES 
        ('Revisão de Copy', client2_id, 'low', 'todo', 1),
        ('Ajuste de Budget Ads', client2_id, 'high', 'review', 0),
        ('Relatório Semanal', client2_id, 'low', 'done', 1);
    END IF;

    IF client3_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.tasks WHERE client_id = client3_id AND title = 'Criação de Logos') THEN
        INSERT INTO public.tasks (title, client_id, priority, stage, position) VALUES 
        ('Criação de Logos', client3_id, 'medium', 'done', 0),
        ('Planejamento de Posts', client3_id, 'low', 'todo', 2);
    END IF;
END $do$;