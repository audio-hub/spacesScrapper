// downloadAudio.js
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Downloads audio from a Space using the HLS URL
 * @param {Object} spaceInfo - Object containing hlsUrl, sessionId, and other metadata
 * @param {string} outputDir - Directory to save the audio file
 * @returns {Promise<string>} Path to the downloaded file
 */
export async function downloadSpaceAudio(spaceInfo, outputDir = "./downloads") {
  if (!spaceInfo?.hlsUrl) {
    throw new Error("Invalid space info: missing HLS URL");
  }

  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const account = spaceInfo.account?.replace("@", "") || "unknown";
  const sessionId = spaceInfo.sessionId || "session";
  
  const outputFilename = `${account}_${sessionId}_${timestamp}.mp3`;
  const outputPath = path.join(outputDir, outputFilename);

  console.log(`⏱️ Starting download for ${spaceInfo.account || "space"}...`);
  
  try {
    // Using ffmpeg to download the HLS stream and convert to mp3
    await execAsync(`ffmpeg -i "${spaceInfo.hlsUrl}" -c:a libmp3lame -q:a 2 "${outputPath}"`);
    
    console.log(`✅ Successfully downloaded to ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error(`❌ Error downloading space audio: ${error.message}`);
    throw error;
  }
}

/**
 * Batch downloads multiple spaces
 * @param {Array} spacesArray - Array of space info objects
 * @param {string} outputDir - Directory to save the audio files
 * @returns {Promise<Array>} Array of downloaded file paths
 */
export async function downloadMultipleSpaces(spacesArray, outputDir = "./downloads") {
  const results = [];
  
  for (const space of spacesArray) {
    try {
      const filePath = await downloadSpaceAudio(space, outputDir);
      results.push({
        account: space.account,
        filePath,
        success: true
      });
    } catch (error) {
      results.push({
        account: space.account,
        error: error.message,
        success: false
      });
    }
  }
  
  return results;
}

// For direct execution with command line arguments
if (import.meta.url === import.meta.main) {
  const spaceInfo = JSON.parse(process.argv[2] || "{}");
  const outputDir = process.argv[3] || "./downloads";
  
  downloadSpaceAudio(spaceInfo, outputDir)
    .then(path => console.log(`Downloaded to: ${path}`))
    .catch(err => {
      console.error(`Download failed: ${err.message}`);
      process.exit(1);
    });
}