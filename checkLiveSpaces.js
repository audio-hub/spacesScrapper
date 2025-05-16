// checkLiveSpaces.js
import { chromium } from "patchright";
import dotenv from "dotenv";
import fs from "node:fs/promises";

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
      console.log(`Checking ${account}...`);
      await page.goto(`https://x.com/${accountName}`, {
        timeout: 30000,
      });
      
      // Wait for content to load
      await page.waitForTimeout(5000);
      
      // Using the EXACT provided proven approach
      let listenLiveButtons = [];
      try {
        listenLiveButtons = await page.$$eval('div', divs => 
          divs
            .filter(div => div.textContent?.trim() === "Listen live")
            .map(div => div.outerHTML)
        );
      } catch (error) {
        console.error(`Error finding "Listen live" divs for ${account}: ${error.message}`);
        continue;
      }
      
      if (listenLiveButtons.length > 0) {
        console.log(`✅ Live space found for ${account}`);
        
        try {
          // Click on the first "Listen live" div
          await page.evaluate(() => {
            const divs = Array.from(document.querySelectorAll('div'));
            const targetDiv = divs.find(div => div.textContent?.trim() === "Listen live");
            if (targetDiv) targetDiv.click();
          });
          
          console.log("Clicked on 'Listen live'");
          
          // Wait for "Start listening" button and click it
          await page.waitForSelector('text=Start listening', { timeout: 8000 });
          await page.click('text="Start listening"');
          console.log("Clicked on 'Start listening'");
          
          // Capture the stream info
          const streamInfo = await captureStreamInfo(page);
          if (streamInfo) {
            liveSpaces.push({
              account,
              ...streamInfo
            });
          }
        } catch (error) {
          console.error(`Error interacting with space for ${account}: ${error.message}`);
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
    const timeout = setTimeout(() => {
      console.log("Timed out waiting for stream info");
      resolve(null);
    }, 15000);
    
    page.on('response', async (response) => {
      try {
        const url = response.url();
        
        // Check if it matches the live video stream API
        if (
          url.includes('https://x.com/i/api/1.1/live_video_stream/') &&
          response.request().method() === 'GET'
        ) {
          try {
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
          } catch (e) {
            console.error("Error parsing JSON response:", e.message);
          }
        }
      } catch (err) {
        console.error("Error processing response:", err.message);
      }
    });
  });
}

// For direct execution
if (import.meta.url.endsWith(process.argv[1])) {
  const spaces = await checkLiveSpaces();
  console.log(`Found ${spaces.length} live spaces`);
  console.log(spaces);
}