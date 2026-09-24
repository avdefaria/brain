-- ============================================================================
-- SEED DE DADOS DE REFERÊNCIA (listas/categorias, não dados de cliente)
-- Rodar depois de schema_live_snapshot.sql. Idempotente (ON CONFLICT DO NOTHING).
-- ============================================================================

INSERT INTO public.squads (name, color) VALUES
  ('Squad Alpha', '#3D4FE8'),
  ('Squad Beta', '#22C55E'),
  ('Squad Gamma', '#F5A524'),
  ('Squad Delta', '#EF4444')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.niches (name) VALUES
  ('Moda'), ('Decoração'), ('Ferramentas'), ('Beleza e Cosméticos'),
  ('Casa e Jardim'), ('Eletrônicos'), ('Pet'), ('Infantil'),
  ('Esporte e Fitness'), ('Alimentos e Bebidas'), ('Saúde e Bem-estar'),
  ('Automotivo'), ('Papelaria'), ('Joias e Acessórios')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.sales_channels (name) VALUES
  ('Mercado Livre'), ('Shopee'), ('Amazon'), ('TikTok Shop'), ('Magalu'),
  ('Americanas'), ('Shein'), ('Loja própria'), ('Instagram')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.deliverable_types (name, is_custom) VALUES
  ('Otimização de Anúncios', false),
  ('Oferta Relâmpago', false),
  ('Descontos', false),
  ('Cupons', false),
  ('Afiliados', false),
  ('Tráfego Pago - Ads', false)
ON CONFLICT DO NOTHING;

INSERT INTO public.churn_reasons (name) VALUES
  ('Preço'), ('Concorrência'), ('Suporte'), ('Outros')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.expense_categories (name) VALUES
  ('Aluguel'), ('Salários'), ('Ferramentas/SaaS'), ('Impostos'), ('Fornecedores'), ('Outros')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.revenue_categories (name) VALUES
  ('Consultoria'), ('Outras Receitas'), ('Rendimentos'), ('Comissões de Afiliados')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.funnel_types (name) VALUES
  ('Prospecção Ativa'), ('Sessão Estratégica'), ('Storytelling')
ON CONFLICT DO NOTHING;

-- Cargos (job_functions): existe drift no banco Lovable sem migration
-- correspondente; assumindo os mesmos valores do enum user_function como
-- ponto de partida razoável. Ajuste livremente depois.
INSERT INTO public.job_functions (name) VALUES
  ('Designer'), ('Copywriter'), ('Gestor de Tráfego'), ('Redator'), ('Desenvolvedor'), ('Administrador')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.company_events (name, date, type, repeat_annually) VALUES
  ('Dia das Mães', '2026-05-10', 'commercial', TRUE),
  ('Dia dos Pais', '2026-08-09', 'commercial', TRUE),
  ('Dia dos Namorados', '2026-06-12', 'commercial', TRUE),
  ('Black Friday', '2026-11-27', 'commercial', FALSE),
  ('Natal', '2026-12-25', 'commercial', TRUE),
  ('Dia do Consumidor', '2026-03-15', 'commercial', TRUE),
  ('Dia das Crianças', '2026-10-12', 'commercial', TRUE)
ON CONFLICT DO NOTHING;
