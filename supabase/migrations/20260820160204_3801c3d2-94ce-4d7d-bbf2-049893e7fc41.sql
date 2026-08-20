-- Create deliverable_types table
CREATE TABLE public.deliverable_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    is_custom BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Grant access to deliverable_types
GRANT SELECT, INSERT ON public.deliverable_types TO authenticated;
GRANT ALL ON public.deliverable_types TO service_role;

-- Enable RLS
ALTER TABLE public.deliverable_types ENABLE ROW LEVEL SECURITY;

-- Create policies for deliverable_types
CREATE POLICY "Allow authenticated users to select deliverable types"
ON public.deliverable_types FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert deliverable types"
ON public.deliverable_types FOR INSERT
TO authenticated
WITH CHECK (true);

-- Populate initial values
INSERT INTO public.deliverable_types (name, is_custom) VALUES
('Otimização de Anúncios', false),
('Oferta Relâmpago', false),
('Descontos', false),
('Cupons', false),
('Afiliados', false),
('Tráfego Pago - Ads', false);

-- Add columns to tasks table
ALTER TABLE public.tasks ADD COLUMN deliverable_type_id UUID REFERENCES public.deliverable_types(id);
ALTER TABLE public.tasks ADD COLUMN sku_reference TEXT;
