// index.js
import { checkLiveSpaces } from "./checkLiveSpaces.js";
import { downloadMultipleSpaces } from "./downloadAudio.js";

/**
 * Main function that checks for live spaces and downloads them
 */
async function main() {
  try {
    console.log("🔍 Checking for live spaces from followed accounts...");
    const liveSpaces = await checkLiveSpaces();
    
    if (liveSpaces.length === 0) {
      console.log("No live spaces found from followed accounts.");
      return;
    }
    
    console.log(`Found ${liveSpaces.length} live spaces. Downloading...`);
    
    const results = await downloadMultipleSpaces(liveSpaces, "./downloads");
    
    // Log summary
    const successful = results.filter(r => r.success).length;
    console.log(`\n📊 Download Summary: ${successful}/${results.length} successful`);
    
    results.forEach(result => {
      if (result.success) {
        console.log(`✅ ${result.account}: ${result.filePath}`);
      } else {
        console.log(`❌ ${result.account}: ${result.error}`);
      }
    });
  } catch (error) {
    console.error("Error in main process:", error);
  }
}

// Run the main function
main();