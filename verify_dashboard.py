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

        # Esperar pelos cards de squad
        try:
            await page.wait_for_selector('h3.text-sm.text-\\[\\#0E0E16\\]', timeout=15000)
            await asyncio.sleep(3)
        except:
            print("Timeout waiting for squad cards")
        
        await page.screenshot(path="/tmp/browser/projects_dashboard.png")
        
        content = await page.content()
        has_techflow = "TechFlow Systems" in content
        
        # Pegar todos os textos dos links de navegação lateral para ver o submenu
        menu_items = await page.evaluate("""() => {
            const nav = document.querySelector('nav');
            if (!nav) return [];
            return Array.from(nav.querySelectorAll('a, span')).map(el => el.innerText.trim());
        }""")
        
        print(f"Has TechFlow Systems: {has_techflow}")
        print(f"Menu Items: {menu_items}")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
