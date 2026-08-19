-- 1. Inserir Cliente com Nicho
WITH new_client AS (
  INSERT INTO public.clients (
    name, cnpj_cpf, address, state, city, corporate_email, contact_whatsapp, start_date, status, risk_level, health_score, niche_id
  )
  VALUES (
    'Empresa Teste Final', '12.345.678/0001-90', 'Rua de Teste, 100', 'SP', 'São Paulo', 'teste@empresa.com', '11988887777', current_date, 'active', 'low', 100,
    (SELECT id FROM niches WHERE name = 'Moda' LIMIT 1)
  )
  RETURNING id
)
-- 2. Vincular 3 Canais de Venda
INSERT INTO public.client_sales_channels (client_id, sales_channel_id)
SELECT (SELECT id FROM new_client), id 
FROM sales_channels 
WHERE name IN ('Mercado Livre', 'Shopee', 'Amazon');

-- 3. Verificar o resultado (Junção)
SELECT 
    c.name as client_name,
    n.name as niche_name,
    array_agg(sc.name) as channels
FROM clients c
LEFT JOIN niches n ON c.niche_id = n.id
LEFT JOIN client_sales_channels csc ON c.id = csc.client_id
LEFT JOIN sales_channels sc ON csc.sales_channel_id = sc.id
WHERE c.name = 'Empresa Teste Final'
GROUP BY c.id, c.name, n.name;