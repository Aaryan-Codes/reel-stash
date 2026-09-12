# Save to Reel Stash — iOS Shortcut

One-time setup (~2 minutes). After this, Instagram → Share → **Save to Reel Stash** replaces sharing to WhatsApp.

## Prerequisites

1. Reel Stash account signed in at your app URL.
2. Copy your **Capture API key** from Settings.
3. App deployed or running locally (use your machine’s LAN IP for local testing).

## Build the Shortcut

1. Open **Shortcuts** on iPhone.
2. Tap **+** → name it **Save to Reel Stash**.
3. Add **Receive** → set input to **URLs** → enable **Share Sheet**.
4. Add **Get Contents of URL**:
   - **URL:** `https://YOUR-APP-URL/api/capture` (from Settings)
   - **Method:** POST
   - **Headers:**
     - `Authorization` → `Bearer YOUR_CAPTURE_KEY`
     - `Content-Type` → `application/json`
   - **Request Body:** JSON
     ```json
     {"url":"Shortcut Input"}
     ```
     (Use the Shortcuts variable for the shared URL.)
5. Optional: Add **Show Notification** → “Saved to Reel Stash”.
6. Tap **Done**.

## Use it

1. Open a reel in Instagram.
2. Tap **Share**.
3. Choose **Save to Reel Stash**.
4. Open Reel Stash → **Inbox** — item appears while processing.

## Troubleshooting

| Issue | Fix |
|---|---|
| 401 Unauthorized | Regenerate capture key in Settings; update Shortcut header |
| Item stuck on “processing” | Check Groq + NVIDIA keys on server; retry via `/api/process` |
| No transcript | Install `yt-dlp` on server; Instagram may block download |
