import asyncio
import os
import json
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()

        # Usar lovable auth-session para obter uma sessão válida
        # Nota: Normalmente eu usaria 'lovable auth-session --json' mas aqui vou tentar a injeção manual se disponível
        storage_key = os.environ.get("LOVABLE_BROWSER_SUPABASE_STORAGE_KEY")
        session_json = os.environ.get("LOVABLE_BROWSER_SUPABASE_SESSION_JSON")
        
        await page.goto("http://localhost:8080", wait_until="networkidle")
        if storage_key and session_json:
            await page.evaluate(
                f"window.localStorage.setItem({json.dumps(storage_key)}, {json.dumps(session_json)})"
            )
            await page.goto("http://localhost:8080/projects", wait_until="networkidle")
        else:
            print("No auth session injected. Attempting to login manually...")
            await page.goto("http://localhost:8080/auth", wait_until="networkidle")
            await page.fill('input[type="email"]', 'alan.vieira.faria@gmail.com')
            await page.fill('input[type="password"]', '745826@Faria')
            await page.click('button[type="submit"]')
            await page.wait_for_url("http://localhost:8080/projects", timeout=15000)

        # Esperar pelo bloco de debug
        try:
            await page.wait_for_selector('div.bg-yellow-50', timeout=20000)
            await asyncio.sleep(3)
        except:
            print("Timeout waiting for debug zone after login attempt")
        
        await page.screenshot(path="/tmp/browser/debug_projects_logged.png")
        
        debug_content = await page.evaluate("""() => {
            const debugZone = document.querySelector('div.bg-yellow-50');
            return debugZone ? debugZone.innerText : "DEBUG ZONE NOT FOUND";
        }""")
        
        print(f"Debug Content:\n{debug_content}")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
