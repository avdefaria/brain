import asyncio
import os
import json
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()

        storage_key = os.environ.get("LOVABLE_BROWSER_SUPABASE_STORAGE_KEY")
        session_json = os.environ.get("LOVABLE_BROWSER_SUPABASE_SESSION_JSON")
        
        await page.goto("http://localhost:8080", wait_until="networkidle")
        if storage_key and session_json:
            await page.evaluate(
                f"window.localStorage.setItem({json.dumps(storage_key)}, {json.dumps(session_json)})"
            )
            await page.goto("http://localhost:8080/projects", wait_until="networkidle")

        # Esperar pelo bloco de debug
        try:
            await page.wait_for_selector('h2:has-text("DEBUG DE DADOS (PROJETOS)")', timeout=15000)
            await asyncio.sleep(2)
        except:
            print("Timeout waiting for debug zone")
        
        await page.screenshot(path="/tmp/browser/debug_projects.png")
        
        debug_content = await page.evaluate("""() => {
            const debugZone = document.querySelector('div.bg-yellow-50');
            return debugZone ? debugZone.innerText : "DEBUG ZONE NOT FOUND";
        }""")
        
        print(f"Debug Content:\n{debug_content}")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
