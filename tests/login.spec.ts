import { test, expect } from '@playwright/test';

test.describe('Fluxo de Autenticação Ongo Brain', () => {
  const loginUrl = 'http://localhost:8080/auth/login';
  const dashboardUrl = 'http://localhost:8080/dashboard';
  const adminEmail = 'alan.vieira.faria@gmail.com';
  const adminPass = '745826@Faria';

  test('Deve permitir login com usuário administrador existente e redirecionar para o dashboard', async ({ page }) => {
    // 1. Navegar para a página de login
    await page.goto(loginUrl);
    
    // 2. Verificar se não há erros de "Setup" visíveis ou no console que bloqueiem a UI
    // (O setup roda em background agora)
    await expect(page.getByText('Brain Ongo')).toBeVisible();
    
    // 3. Preencher credenciais
    await page.get_by_label('E-mail').fill(adminEmail);
    await page.get_by_label('Senha').fill(adminPass);
    
    // 4. Clicar em Entrar
    await page.get_by_role('button', { name: 'Entrar' }).click();
    
    // 5. Verificar redirecionamento
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    expect(page.url()).toContain('/dashboard');
    
    // 6. Verificar se o AppShell (Sidebar) está visível indicando login completo
    await expect(page.getByText('Dashboard', { exact: true })).toBeVisible();
  });

  test('Não deve mostrar erro de "usuário já registrado" na interface ao carregar o login', async ({ page }) => {
    await page.goto(loginUrl);
    
    // Garantir que a mensagem de erro técnica do setupAdmin não vaza para o usuário
    const setupErrorMessage = page.getByText(/Setup error|already registered/i);
    await expect(setupErrorMessage).not.toBeVisible();
  });
});
