# API keys & free accounts

Create these accounts first. All are free — no credit card required for personal use.

## 1. Supabase (database, auth, file storage)

| | |
|---|---|
| **Sign up** | https://supabase.com/dashboard/sign-in |
| **Dashboard** | https://supabase.com/dashboard |
| **What you need** | Project URL, anon key, service role key |

**Steps**
1. Sign in with GitHub or email.
2. **New project** → pick a name (e.g. `reel-stash`), set a DB password (save it).
3. Wait ~2 min for provisioning.
4. Go to **Project Settings → API**:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` `secret` key → `SUPABASE_SERVICE_ROLE_KEY` (server only, never expose to browser)

**Free tier:** 500 MB database, 1 GB file storage, 50k MAU.

Docs: https://supabase.com/docs/guides/getting-started

---

## 2. Groq (Whisper transcription)

| | |
|---|---|
| **Sign up** | https://console.groq.com |
| **API keys** | https://console.groq.com/keys |
| **Rate limits** | https://console.groq.com/docs/rate-limits |

**Steps**
1. Create account (no card).
2. **API Keys → Create API Key**.
3. Copy key → `GROQ_API_KEY`

**Free tier:** ~8 hours of audio/day, 2,000 requests/day, model `whisper-large-v3-turbo`.

Docs: https://console.groq.com/docs/speech-to-text

---

## 3. NVIDIA NIM / Nemotron (summarization & extraction)

| | |
|---|---|
| **Sign up** | https://build.nvidia.com |
| **API keys** | https://build.nvidia.com/settings/api-keys |
| **Nemotron models** | https://build.nvidia.com/search?q=nemotron |
| **API base URL** | `https://integrate.api.nvidia.com/v1` |

**Steps**
1. Join the free **NVIDIA Developer Program** at build.nvidia.com.
2. **Settings → API Keys → Generate**.
3. Copy key → `NVIDIA_API_KEY`
4. Verify your model ID: `GET https://integrate.api.nvidia.com/v1/models` with `Authorization: Bearer YOUR_KEY`.  
   Default in this app: `nvidia/llama-3.1-nemotron-70b-instruct`

**Free tier:** ~40 requests/minute, ~1,000 inference credits on signup.

Docs: https://docs.api.nvidia.com/nim/reference/

---

## 4. Render (hosting — set up when ready to deploy)

| | |
|---|---|
| **Sign up** | https://dashboard.render.com/register |
| **Dashboard** | https://dashboard.render.com |

**Steps**
1. Sign up with GitHub.
2. Later: **New → Web Service** → connect this repo.
3. Add env vars from `.env.local` in Render dashboard.

**Free tier:** 512 MB RAM, spins down when idle (~30s cold start).

Docs: https://render.com/docs/free

---

## 5. GitHub API (optional — higher rate limits)

| | |
|---|---|
| **Tokens** | https://github.com/settings/tokens |
| **New fine-grained token** | https://github.com/settings/personal-access-tokens/new |

**Steps**
1. Create token with **Public repositories → Read-only** (or classic token, no scopes needed for public repos).
2. Copy → `GITHUB_TOKEN` (optional; unauthenticated works for light use)

---

## Local setup

1. Copy env template:
   ```bash
   cp .env.example .env.local
   ```
2. Fill in keys from steps above.
3. Run migrations after Supabase is configured (see README).

## Quick checklist

- [ ] Supabase project created + 3 keys copied
- [ ] Groq API key created
- [ ] NVIDIA API key created + Nemotron model verified
- [ ] `.env.local` filled in
- [ ] (Later) Render account for deployment
