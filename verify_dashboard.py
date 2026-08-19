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
                f"(key, val) => window.localStorage.setItem(key, val)", storage_key, session_json
            )
            await page.goto("http://localhost:8080/projects", wait_until="networkidle")

        # Esperar pelo carregamento dos dados (cards de squad)
        await page.wait_for_selector('.animate-in', timeout=10000)
        await asyncio.sleep(2) # Dar tempo para o React Query hidratar
        
        await page.screenshot(path="/tmp/browser/projects_dashboard.png")
        
        content = await page.content()
        has_techflow = "TechFlow Systems" in content
        
        menu_items = await page.evaluate("""() => {
            const items = Array.from(document.querySelectorAll('nav a'));
            return items.map(a => a.innerText.trim());
        }""")
        
        print(f"Has TechFlow Systems: {has_techflow}")
        print(f"Menu Items: {menu_items}")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
