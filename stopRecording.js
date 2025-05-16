#!/usr/bin/env node
// stopRecordings.js
import { stopAllRecordings } from './downloadAudio.js';

console.log("🛑 Stopping all active recordings...");
const stoppedCount = await stopAllRecordings('./downloads');

if (stoppedCount > 0) {
  console.log(`✅ Successfully stopped ${stoppedCount} recording processes.`);
} else {
  console.log(`⚠️ No active recordings were found or stopped.`);
}
