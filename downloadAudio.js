// downloadAudio.js
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { exec } from 'node:child_process';
import * as https from 'node:https';

const execAsync = promisify(exec);

// Create a function to cleanly stop recording processes
export async function stopAllRecordings(outputDir = "./downloads") {
  try {
    // Find all PID files in the output directory
    const files = fs.readdirSync(outputDir);
    const pidFiles = files.filter(file => file.endsWith('.pid'));
    
    if (pidFiles.length === 0) {
      console.log("No active recordings found.");
      return 0;
    }
    
    console.log(`Found ${pidFiles.length} recording processes to stop...`);
    let stoppedCount = 0;
    
    for (const pidFile of pidFiles) {
      try {
        const pidPath = path.join(outputDir, pidFile);
        const pid = fs.readFileSync(pidPath, 'utf8').trim();
        
        // Try to stop the process
        try {
          process.kill(parseInt(pid), 'SIGTERM');
          console.log(`✅ Stopped recording process ${pid}`);
          stoppedCount++;
          
          // Remove the PID file
          fs.unlinkSync(pidPath);
        } catch (e) {
          console.log(`⚠️ Could not stop process ${pid}: ${e.message}`);
          // Remove stale PID file if process doesn't exist
          if (e.code === 'ESRCH') {
            fs.unlinkSync(pidPath);
          }
        }
      } catch (err) {
        console.error(`Error processing PID file ${pidFile}: ${err.message}`);
      }
    }
    
    console.log(`Stopped ${stoppedCount} recording processes.`);
    return stoppedCount;
  } catch (error) {
    console.error(`Error stopping recordings: ${error.message}`);
    return 0;
  }
}

// Helper function to fetch content
function fetchContent(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP Error: ${response.statusCode}`));
        return;
      }
      
      let data = '';
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        resolve(data);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Saves information about a Space without attempting to download audio
 * @param {Object} spaceInfo - Object containing hlsUrl, sessionId, and other metadata
 * @param {string} outputDir - Directory to save the information
 * @returns {Promise<string>} Path to the saved info file
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
  
  const m3u8Filename = `${account}_${sessionId}_${timestamp}.m3u8`;
  const m3u8Path = path.join(outputDir, m3u8Filename);
  
  const infoFilename = `${account}_${sessionId}_${timestamp}.json`;
  const infoPath = path.join(outputDir, infoFilename);

  console.log(`⏱️ Saving Space information for ${spaceInfo.account || "space"}...`);
  
  try {
    // Save all stream metadata as JSON
    fs.writeFileSync(infoPath, JSON.stringify(spaceInfo, null, 2));
    
    // Extract the base URL from the HLS URL
    const hlsUrl = spaceInfo.hlsUrl;
    const baseUrlMatch = hlsUrl.match(/(https:\/\/[^\/]+)\//);
    const baseUrl = baseUrlMatch ? baseUrlMatch[1] : '';
    
    try {
      // Fetch the actual m3u8 content to save a proper playlist
      const content = await fetchContent(hlsUrl);
      
      // Fix relative URLs by prepending the base URL
      const fixedContent = content.replace(/^\/Transcoding/gm, `${baseUrl}/Transcoding`);
      
      fs.writeFileSync(m3u8Path, fixedContent);
      console.log(`✅ Successfully saved fixed M3U8 playlist to ${m3u8Path}`);
    } catch (error) {
      console.error(`Warning: Could not fetch master playlist: ${error.message}`);
      console.log("Creating simple reference playlist instead...");
      
      // Create a simple m3u8 file that references the HLS stream
      const m3u8Content = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=256000,RESOLUTION=640x360
${spaceInfo.hlsUrl}
`;
      fs.writeFileSync(m3u8Path, m3u8Content);
    }
    
    console.log(`✅ Successfully saved Space information to ${infoPath}`);
    console.log(`🔗 Stream URL: ${spaceInfo.hlsUrl}`);
    console.log(`📝 M3U8 playlist saved to: ${m3u8Path}`);
    console.log(`💡 To listen, try playing the saved m3u8 file with VLC or another player.`);
    
    return infoPath;
  } catch (error) {
    console.error(`❌ Error saving Space information: ${error.message}`);
    throw error;
  }
}

/**
 * Batch processes multiple spaces
 * @param {Array} spacesArray - Array of space info objects
 * @param {string} outputDir - Directory to save the information
 * @param {boolean} downloadAudio - Whether to attempt audio download
 * @returns {Promise<Array>} Array of results
 */
export async function downloadMultipleSpaces(spacesArray, outputDir = "./downloads", downloadAudio = true) {
  const results = [];
  
  for (const space of spacesArray) {
    try {
      const filePath = await downloadSpaceAudio(space, outputDir, downloadAudio);
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
if (import.meta.url.endsWith(process.argv[1])) {
  try {
    const spaceInfo = JSON.parse(process.argv[2] || "{}");
    const outputDir = process.argv[3] || "./downloads";
    const downloadAudio = process.argv[4] !== "false"; // Default to true unless explicitly set to "false"
    
    downloadSpaceAudio(spaceInfo, outputDir, downloadAudio)
      .then(path => console.log(`Saved to: ${path}`))
      .catch(err => {
        console.error(`Failed: ${err.message}`);
        process.exit(1);
      });
  } catch (error) {
    console.error(`Error parsing arguments: ${error.message}`);
    process.exit(1);
  }
}