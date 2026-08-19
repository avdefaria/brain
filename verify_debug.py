import asyncio
import os
import json
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()

        session_file = "/root/.cache/lovable-auth/session.json"
        with open(session_file) as f:
            minted = json.load(f)
        
        storage_key = minted["storage_key"]
        session_json = json.dumps(minted["session"])
        cookies = minted["cookies"]
        
        for c in cookies:
            c["url"] = "http://localhost:8080"
        await context.add_cookies(cookies)

        await page.goto("http://localhost:8080/auth", wait_until="networkidle")
        
        # Correção do evaluate
        await page.evaluate(
            "(data) => window.localStorage.setItem(data.key, data.val)", 
            {"key": storage_key, "val": session_json}
        )
        
        print("Navigating to /projects...")
        await page.goto("http://localhost:8080/projects", wait_until="networkidle")
        await asyncio.sleep(8)
        
        await page.screenshot(path="/tmp/browser/debug_projects_final.png")
        
        url = page.url
        print(f"Current URL: {url}")
        
        debug_content = await page.evaluate("""() => {
            const debugZone = document.querySelector('div.bg-yellow-50');
            return debugZone ? debugZone.innerText : "DEBUG ZONE NOT FOUND";
        }""")
        
        print(f"Debug Content:\n{debug_content}")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
