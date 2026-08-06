# Outreach AI - Autonomous Networking & Portfolio Platform

Outreach AI is a production-grade, full-stack autonomous lead sourcing, client outreach, recruiter networking, and portfolio generation hub tailored for freelancers and students.

---

## 🚀 Features

- **Autonomous Recruiter & Client Sourcing**: Multi-agent background workers scrape and discover matching leads on LinkedIn, Twitter/X, and Upwork.
- **Cognitive Match Scoring**: Uses Gemini 2.5 Flash to automatically evaluate leads, select matches, and write custom introduction pitches.
- **Freelancer "Busy Mode"**: If active, automatically drafts polite buffer responses asking clients to wait ~2 days.
- **Human Handoff Inbox**: Pushes positive responses to a dedicated inbox containing suggested Gemini replies, while archiving negatives.
- **Web Presence Generator**: Converts work samples into beautiful, responsive single-page portfolios utilizing Gemini web designers.

---

## 🛠️ Tech Stack

- **Frontend**: React 18 + TS + Vite, Tailwind CSS + Framer Motion, Zustand, Recharts, Socket.io-client.
- **Express Backend**: Node.js + Express + TS, Socket.io (authenticated with Supabase JWT), Redis Pub/Sub, Zod.
- **Background Worker**: BullMQ + Redis, Playwright (Anti-detection viewport/scroll configurations), Google Gen AI SDK (`gemini-2.5-flash`).
- **Database & Auth**: Supabase Cloud PostgreSQL with Row Level Security (RLS) policies and JWT auth.

---

## 📁 Repository Structure

```
project-root/
├── client/              # React SPA (Vercel)
├── server/              # Express API & WS Server (Render Web Service)
├── workers/             # BullMQ background workers (Render Background Worker)
├── database/
│   └── migrations/
│       └── 001_initial_schema.sql
├── docs/
│   └── API.md
├── package.json         # Workspace execution script
├── .gitignore
└── README.md
```

---

## ⚙️ Local Development Setup

### 1. Prerequisites
Ensure you have the following installed on your machine:
- **Node.js** (v18 or higher)
- **Redis Server** (listening on default port `6379`)

### 2. Install Workspace Dependencies
From the repository root, install packages across all three folders:
```bash
npm run install:all
```

### 3. Setup PostgreSQL Schema
1. Create a project in your [Supabase Console](https://supabase.com).
2. Go to **SQL Editor** in your project dashboard.
3. Open a new query, paste the contents of [001_initial_schema.sql](file:///c:/Users/Uday%20Kumar/projects/Outreach%20AI%20claude/database/migrations/001_initial_schema.sql), and run it. This creates the tables, triggers, indexes, and RLS policies.

### 4. Configure Environment Variables
Create `.env` files in `client/`, `server/`, and `workers/` directories by copying their respective `.env.example` templates:

#### For `server/.env`:
```ini
PORT=5000
SUPABASE_URL=https://your-supabase-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
REDIS_URL=redis://localhost:6379
SIMULATE_AUTOMATION=true
```

#### For `workers/.env`:
```ini
SUPABASE_URL=https://your-supabase-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
REDIS_URL=redis://localhost:6379
GEMINI_API_KEY=your-gemini-key
SIMULATE_AUTOMATION=true
```

#### For `client/.env`:
```ini
VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_USE_MOCK_AUTH=true
```

> [!NOTE]
> **Developer Sandbox Mode**:
> Leaving `VITE_USE_MOCK_AUTH=true` in `client/.env` and `SIMULATE_AUTOMATION=true` in `server/workers/.env` allows the entire workspace to run without registering real Supabase / Gemini credentials. Playwright will crawl mock pages served on localhost, evaluate them, send messages, and populate the dashboard graph.

### 5. Running the Application
Ensure Redis is running locally. Then run the start command from the project root:
```bash
npm run dev
```
This spins up:
- **API Server** at `http://localhost:5000`
- **Background Worker** polling BullMQ queues
- **React Frontend** dev server at `http://localhost:3000`

---

## 🚢 Production Deployment

### Client (Vercel)
1. Import the root repository to your Vercel Dashboard.
2. Set the **Root Directory** as `client`.
3. Set the build command as `npm run build` and output directory as `dist`.
4. Configure these environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_USE_MOCK_AUTH=false`

### API Server (Render Web Service)
1. Create a new **Web Service** on Render.
2. Select root folder as `server`.
3. Build command: `npm run install:all && npm run build --prefix server`
4. Start command: `node dist/index.js`
5. Map env vars: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `REDIS_URL` (use Render Redis addon), `SIMULATE_AUTOMATION=false`.

### Background Worker (Render Background Worker)
1. Create a new **Background Worker** on Render.
2. Select root folder as `workers`.
3. Build command: `npm run install:all && npm run build --prefix workers`
4. Start command: `node dist/index.js`
5. Map env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `REDIS_URL`, `GEMINI_API_KEY`, `SIMULATE_AUTOMATION=false`.
