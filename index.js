import { chromium } from "patchright";
import dotenv from "dotenv";

dotenv.config();

(async () => {
  const browser = await chromium.launchPersistentContext("...", {
    channel: "chrome",
    headless: false,
    viewport: null,
  });

  const page = await browser.newPage();
  await page.goto('https://x.com/search?q=filter%3Aspaces&src=typed_query&f=live',
    {
      waitUntil: 'domcontentloaded',
      timeout: 60000, // optional longer timeout    
    }
  );

  // Wait for the page content to load (adjust selector as needed)
  await page.waitForTimeout(10000);
  console.log("BINGO!")
  
  // Evaluate the page and get all matching divs
  let matchingDivs = await page.$$eval('div', divs =>
    divs
      .filter(div => div.textContent?.trim() === "Listen live")
      .map(div => div.outerHTML) // Or any other data you want to extract
  );

  // Find and click the first "Listen live" div
  let divs = await page.$$('div');

  for (const div of divs) {
      await div.click();
      console.log("Clicked on the first 'Listen live' div.");
      break;
  }


  await page.waitForSelector('text=Start listening');

  console.log("BINGO 2 !")

  await page.click('text="Start listening"');
  console.log("Clicked on 'Start listening'");


  // Intercept responses
  page.on('response', async (response) => {
    try {
      const url = response.url();

      // Check if it matches the live video stream API
      if (
        url.includes('https://x.com/i/api/1.1/live_video_stream/') &&
        response.request().method() === 'GET'
      ) {
        const json = await response.json();

        // Optionally validate it has the structure you want
        if (json?.source?.location?.includes("periscope") && json?.sessionId) {
          console.log("✅ Found matching JSON payload!");
          console.log("🔗 HLS URL:", json.source.location);
          console.log("Session ID:", json.sessionId);
          console.log("Share URL:", json.shareUrl);
        }
      }
    } catch (err) {
      console.error("Error processing response:", err);
    }
  });


})();
