import asyncio
import os
import json
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        storage_key = os.environ.get("LOVABLE_BROWSER_SUPABASE_STORAGE_KEY")
        session_json = os.environ.get("LOVABLE_BROWSER_SUPABASE_SESSION_JSON")
        
        await page.goto("http://localhost:8080", wait_until="networkidle")
        if storage_key and session_json:
            await page.evaluate(
                f"window.localStorage.setItem({json.dumps(storage_key)}, {json.dumps(session_json)})"
            )
            await page.reload(wait_until="networkidle")

        print("\n--- Testing getProjectsOverviewData Query Structure (FINAL) ---")
        result1 = await page.evaluate("""async () => {
            try {
                const { supabase } = await import('/src/integrations/supabase/client.ts');
                const { data, error } = await supabase
                  .from('squads')
                  .select(`
                    *,
                    account_squads (
                      accounts (
                        id,
                        health_score,
                        clients (
                          id,
                          name,
                          project_deliveries (
                            id,
                            current_count,
                            target_count
                          )
                        )
                      )
                    )
                  `);
                return { data, error };
            } catch (e) {
                return { error: e.message };
            }
        }""")
        print(json.dumps(result1, indent=2))

        print("\n--- Testing Clients Management Query Structure (FINAL) ---")
        result2 = await page.evaluate("""async () => {
            try {
                const { supabase } = await import('/src/integrations/supabase/client.ts');
                const { data, error } = await supabase
                  .from("clients")
                  .select(`
                    *,
                    client_sales_channels (
                      sales_channels (name)
                    ),
                    niches (name),
                    accounts (
                      id,
                      account_name,
                      account_squads ( squads (id, name) )
                    )
                  `)
                  .order('created_at', { ascending: false });
                return { data, error };
            } catch (e) {
                return { error: e.message };
            }
        }""")
        print(json.dumps(result2, indent=2))

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
