// checkLiveSpaces.js
import { chromium } from "patchright";
import dotenv from "dotenv";
import fs from "fs/promises";

dotenv.config();

/**
 * Checks for live spaces from followed accounts
 * @returns {Promise<Array>} Array of live space data objects with URLs and metadata
 */
export async function checkLiveSpaces() {
  // Read the following list
  const followingData = JSON.parse(await fs.readFile('./following.json', 'utf8'));
  const accounts = followingData.following;
  
  const liveSpaces = [];
  const browser = await chromium.launchPersistentContext("...", {
    channel: "chrome",
    headless: false,
    viewport: null,
  });

  try {
    const page = await browser.newPage();
    
    // Check each followed account for live spaces
    for (const account of accounts) {
      const accountName = account.startsWith('@') ? account.substring(1) : account;
      
      // Go directly to the user's page
      await page.goto(`https://x.com/${accountName}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      
      // Wait for content to load
      await page.waitForTimeout(3000);
      
      // Look for "Listen live" indicators
      const hasLiveSpace = await page.$$eval('div', divs =>
        divs.some(div => div.textContent?.trim() === "Listen live")
      );
      
      if (hasLiveSpace) {
        console.log(`✅ Live space found for ${account}`);
        
        // Find and click the "Listen live" element
        const divs = await page.$$('div');
        
        for (const div of divs) {
          const text = await div.evaluate(node => node.textContent?.trim());
          if (text === "Listen live") {
            await div.click();
            console.log("Clicked on 'Listen live'");
            
            // Wait for "Start listening" button and click it
            await page.waitForSelector('text=Start listening', { timeout: 5000 });
            await page.click('text="Start listening"');
            
            // Capture the stream info
            const streamInfo = await captureStreamInfo(page);
            if (streamInfo) {
              liveSpaces.push({
                account,
                ...streamInfo
              });
            }
            
            break;
          }
        }
      } else {
        console.log(`No live space for ${account}`);
      }
    }
    
    return liveSpaces;
  } finally {
    await browser.close();
  }
}

/**
 * Captures the stream information from an open space
 * @param {Page} page - Playwright page object
 * @returns {Promise<Object|null>} Stream info object or null if not found
 */
async function captureStreamInfo(page) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), 10000);
    
    page.on('response', async (response) => {
      try {
        const url = response.url();
        
        // Check if it matches the live video stream API
        if (
          url.includes('https://x.com/i/api/1.1/live_video_stream/') &&
          response.request().method() === 'GET'
        ) {
          const json = await response.json();
          
          // Validate the response has the structure we want
          if (json?.source?.location?.includes("periscope") && json?.sessionId) {
            clearTimeout(timeout);
            
            resolve({
              hlsUrl: json.source.location,
              sessionId: json.sessionId,
              shareUrl: json.shareUrl
            });
          }
        }
      } catch (err) {
        console.error("Error processing response:", err);
      }
    });
  });
}

// For direct execution
if (import.meta.url === import.meta.main) {
  const spaces = await checkLiveSpaces();
  console.log(`Found ${spaces.length} live spaces`);
  console.log(spaces);
}