import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch_persistent_context(
            user_data_dir="/home/luan/Desktop/l-english-academy/scraping/.playwright_user_data",
            headless=True
        )
        page = await browser.new_page()
        url = "https://ngoaingu24h.vn/bai-hoc/bo-de-2022-bo-de-thi-thu-sat-de-thi-toeic-that-de-so-01-5734880069550080"
        print(f"Navigating to {url}")
        await page.goto(url)
        await asyncio.sleep(5)
        
        try:
            xem_lai_btn = page.locator("a:has-text('Xem lại bài làm'), button:has-text('Xem lại bài làm')").first
            if await xem_lai_btn.count() > 0:
                await xem_lai_btn.click()
                print("Clicked 'Xem lại bài làm'")
                await asyncio.sleep(5)
        except Exception as e:
            print("No 'Xem lại bài làm' button clicked:", e)

        for q_num in [142, 143, 144, 145, 146, 147, 148]:
            btn = page.locator(f"button:has-text('{q_num}')").first
            if await btn.count() > 0:
                await btn.click()
                await asyncio.sleep(1.5)
                headings = await page.locator(".game-object-quiz-wrap, .question-detail-container, .quiz-item").all()
                heading_texts = []
                for h in headings:
                    if await h.is_visible():
                        txt = await h.inner_text()
                        first_line = txt.split('\n')[0]
                        heading_texts.append(first_line)
                print(f"Button {q_num} clicked. Visible question headers: {heading_texts}")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
