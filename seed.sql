-- Create a trigger function to assign 'admin' role to the first user
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger AS $$
BEGIN
    IF (SELECT count(*) FROM public.user_roles) = 0 THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (new.id, 'admin');
    ELSE
        INSERT INTO public.user_roles (user_id, role)
        VALUES (new.id, 'user');
    END IF;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created_role
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- Insert Squads
INSERT INTO public.squads (name, description) VALUES 
('Squad Alpha', 'Foco em Design e UX'),
('Squad Beta', 'Foco em Performance e Ads')
ON CONFLICT DO NOTHING;

-- Insert Clients
INSERT INTO public.clients (name, industry, status, risk_level) VALUES 
('TechFlow Systems', 'Tecnologia', 'active', 'low'),
('Global Logistics', 'Transporte', 'active', 'medium'),
('Urban Eats', 'Alimentação', 'active', 'high')
ON CONFLICT (name) DO NOTHING;

-- Insert Contracts for these clients
DO $$
DECLARE
    client1_id uuid;
    client2_id uuid;
    client3_id uuid;
BEGIN
    SELECT id INTO client1_id FROM public.clients WHERE name = 'TechFlow Systems';
    SELECT id INTO client2_id FROM public.clients WHERE name = 'Global Logistics';
    SELECT id INTO client3_id FROM public.clients WHERE name = 'Urban Eats';

    IF client1_id IS NOT NULL THEN
        INSERT INTO public.contracts (client_id, title, value, status, start_date) 
        VALUES (client1_id, 'Manutenção Mensal', 5000, 'active', now())
        ON CONFLICT DO NOTHING;
    END IF;

    IF client2_id IS NOT NULL THEN
        INSERT INTO public.contracts (client_id, title, value, status, start_date) 
        VALUES (client2_id, 'Campanha Q3', 12000, 'active', now())
        ON CONFLICT DO NOTHING;
    END IF;

    IF client3_id IS NOT NULL THEN
        INSERT INTO public.contracts (client_id, title, value, status, start_date) 
        VALUES (client3_id, 'Social Media Full', 3500, 'active', now())
        ON CONFLICT DO NOTHING;
    END IF;

    -- Insert Tasks
    IF client1_id IS NOT NULL THEN
        INSERT INTO public.tasks (title, client_id, priority, stage, position) VALUES 
        ('Setup de Analytics', client1_id, 'high', 'todo', 0),
        ('Design da Home', client1_id, 'medium', 'doing', 0),
        ('Integração API CRM', client1_id, 'high', 'doing', 1)
        ON CONFLICT DO NOTHING;
    END IF;

    IF client2_id IS NOT NULL THEN
        INSERT INTO public.tasks (title, client_id, priority, stage, position) VALUES 
        ('Revisão de Copy', client2_id, 'low', 'todo', 1),
        ('Ajuste de Budget Ads', client2_id, 'high', 'review', 0),
        ('Relatório Semanal', client2_id, 'low', 'done', 1)
        ON CONFLICT DO NOTHING;
    END IF;

    IF client3_id IS NOT NULL THEN
        INSERT INTO public.tasks (title, client_id, priority, stage, position) VALUES 
        ('Criação de Logos', client3_id, 'medium', 'done', 0),
        ('Planejamento de Posts', client3_id, 'low', 'todo', 2)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;
