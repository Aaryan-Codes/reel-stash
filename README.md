# Reel Stash

Personal inbox for Instagram reels and links — transcribes audio with Groq Whisper, summarizes with NVIDIA Nemotron, organizes by category.

## Before you run the app

**Create accounts and copy API keys:** see [docs/API_KEYS.md](./docs/API_KEYS.md)

| Service | Sign up | Where to get the key |
|---|---|---|
| **Supabase** | [supabase.com/dashboard/sign-in](https://supabase.com/dashboard/sign-in) | Project Settings → API |
| **Groq** (Whisper) | [console.groq.com](https://console.groq.com) | [API Keys](https://console.groq.com/keys) |
| **NVIDIA Nemotron** | [build.nvidia.com](https://build.nvidia.com) | [API Keys](https://build.nvidia.com/settings/api-keys) |
| **Render** (deploy later) | [dashboard.render.com/register](https://dashboard.render.com/register) | Dashboard env vars |

## Setup

1. **Supabase:** Create a project, run the SQL in [supabase/migrations/001_initial.sql](./supabase/migrations/001_initial.sql) in the SQL editor. Add redirect URL `http://localhost:3000/auth/callback`.
2. **Env:** `cp .env.example .env.local` and fill in keys.
3. **yt-dlp** (for Instagram audio): `brew install yt-dlp` on Mac (included in Dockerfile for Render).
4. **Run:**

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign in, go to **Settings** for your capture API key and iOS Shortcut instructions.

## iOS Shortcut

See [ios-shortcut/README.md](./ios-shortcut/README.md).

## Deploy (Render)

1. Push repo to GitHub.
2. Render → **New → Blueprint** → connect repo (uses [render.yaml](./render.yaml)).
3. Add env vars from `.env.local`.
4. Set `NEXT_PUBLIC_APP_URL` to your Render URL.
5. Daily cron in `render.yaml` calls `/api/cron` for retries and 60-day expiry.
