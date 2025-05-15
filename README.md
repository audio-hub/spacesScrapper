# 🎙️ audiohub

Automatically track, download, and summarize **Twitter Spaces** — starting with Bitcoin/finance content — and convert them into engaging, short-form videos and interactive transcripts.

---

## 🚀 Features

- 🔍 **Twitter Spaces Tracker**
  - Auto-detect live Spaces from followed accounts
  - Extract HLS stream URLs and metadata

- 🎧 **Audio to Text**
  - Uses OpenAI for high-quality transcription

- 🧠 **Summarization**
  - Key takeaways and topic highlights from long-form audio

- 🎬 **Highlight Video Generator**
  - Subtitle-rich short-form videos for TikTok, Reels, etc.

- 📜 **Interactive Transcript UI**
  - Click-to-play transcript
  - Clip downloads on demand

---

## 🛠️ Getting Started

1. **Install Dependencies**

    ```bash
    npm install
    ```

2. **Set Environment Variables**

    Create a `.env` file and include any required keys (e.g., OpenAI API, etc.).

3. **Run the Tracker Script**

    ```bash
    node index.js
    ```

    The script:
    - Launches a Chrome session
    - Searches for live Twitter Spaces
    - Clicks on "Listen live"
    - Extracts stream metadata from X responses

---

## 🧩 Tech Stack

- `patchright` (Chromium automation)
- `dotenv` (environment variables)
- `OpenAI` (transcription & summarization)
- Planned: video generation (FFmpeg or similar)

---

## 📌 Status

🔄 Work in progress — currently supports stream tracking and metadata capture. Next up:
- Transcription pipeline
- UI for transcript & video interaction
- Automated highlight generation

---
