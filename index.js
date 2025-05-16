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
    
    console.log(`Found ${liveSpaces.length} live spaces. Starting recordings...`);
    
    const results = await downloadMultipleSpaces(liveSpaces, "./downloads", true);
    
    // Log summary
    const successful = results.filter(r => r.success).length;
    console.log(`\n📊 Live Space Summary: ${successful}/${results.length} recordings started`);
    console.log(`\n⚠️  IMPORTANT: Recordings will continue in the background until manually stopped.`);
    console.log(`   To stop all recordings, run: pkill -f ffmpeg`);
    
    results.forEach(result => {
      if (result.success) {
        const isMP3 = result.filePath.endsWith('.mp3');
        console.log(`${isMP3 ? '🎵' : '📄'} ${result.account}: ${result.filePath}`);
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