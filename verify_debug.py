import asyncio
import os
import json
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()

        # Carregar a sessão gerada
        session_file = "/root/.cache/lovable-auth/session.json"
        with open(session_file) as f:
            minted = json.load(f)
        
        storage_key = minted["storage_key"]
        session_json = json.dumps(minted["session"])
        cookies = minted["cookies"]
        
        for c in cookies:
            c["url"] = "http://localhost:8080"
        await context.add_cookies(cookies)

        await page.goto("http://localhost:8080", wait_until="networkidle")
        await page.evaluate(
            f"window.localStorage.setItem({json.dumps(storage_key)}, {json.dumps(session_json)})"
        )
        
        # Navegar para a rota /projects
        await page.goto("http://localhost:8080/projects", wait_until="networkidle")

        # Esperar pelo bloco de debug
        try:
            await page.wait_for_selector('div.bg-yellow-50', timeout=20000)
            await asyncio.sleep(3)
        except:
            print("Timeout waiting for debug zone")
        
        await page.screenshot(path="/tmp/browser/debug_projects_final.png")
        
        debug_content = await page.evaluate("""() => {
            const debugZone = document.querySelector('div.bg-yellow-50');
            return debugZone ? debugZone.innerText : "DEBUG ZONE NOT FOUND";
        }""")
        
        print(f"Debug Content:\n{debug_content}")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
