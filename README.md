# DevPulse

> Your dev life, all in one pulse.
> A full-stack developer analytics dashboard that aggregates your activity from GitHub, LeetCode, GeeksForGeeks, Codeforces, Wakatime, and Dev.to into one beautiful, shareable profile.

## Tech stack

**Frontend** — React 18 (Vite), React Router v6, Recharts, TailwindCSS, Zustand, Axios.
**Backend** — Node.js + Express, PostgreSQL (Supabase), Redis (Upstash), BullMQ, Passport.js (GitHub OAuth), Nodemailer, Zod, Winston.

## Project layout

```
devpulse/
├── client/         # React + Vite frontend
├── server/         # Express API + BullMQ workers
├── package.json    # Root tasks (dev, migrate, worker)
└── README.md
```

## Quick start

### 1. Prerequisites

- Node.js 18+ and npm
- A Postgres database (Supabase works great)
- Redis (Upstash recommended) — optional but required for caching + background jobs
- A GitHub OAuth App ([create one](https://github.com/settings/developers))
  - Authorization callback URL: `http://localhost:5000/api/auth/github/callback`

### 2. Configure environment

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
# fill in DATABASE_URL, REDIS_URL, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, JWT_SECRET, ENCRYPTION_KEY
```

`ENCRYPTION_KEY` must be a 32-byte hex string (64 chars). Generate one with:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Install dependencies

```bash
npm run install:all
```

### 4. Apply database schema

```bash
npm run migrate
```

This runs `server/sql/schema.sql` against the `DATABASE_URL` and creates all tables, indexes and triggers.

### 5. Run the app

In separate terminals:

```bash
# API
npm run dev:server          # → http://localhost:5000

# Background worker (optional, needs REDIS_URL)
npm run worker

# Frontend
npm run dev:client          # → http://localhost:5173
```

Or all at once:
```bash
npm run dev
```

## Features

- **GitHub OAuth** sign-in with httpOnly JWT cookies.
- **Platform connections** for GitHub, LeetCode, GFG, Codeforces, Wakatime (encrypted API key), Dev.to.
- **DevScore** — weighted 0–1000 composite score that mixes commits, problem solves, coding hours, contest rating and GFG points.
- **Beautiful dashboard** — DevScore donut, contribution heatmap, language radar, hours bar chart, LeetCode difficulty pie, streak tracker, platform status grid, activity feed.
- **Public profiles** at `/u/:username` (no auth required to view).
- **Leaderboard** ranked by DevScore or per-platform metric, paginated.
- **Community feed** of activity from devs you follow.
- **Shareable card** (`GET /api/card/:username/svg`) — high-quality SVG with avatar, score and top stats.
- **Badges** — Problem Slayer, Polyglot, Streak Master, Open Source Hero, Prolific Writer.
- **Spotify-Wrapped style recap** at `/wrapped`.
- **Background refresh** — BullMQ refreshes all users' stats every 6 hours.
- **Weekly digest emails** every Monday morning (Nodemailer).
- **Caching** — Redis-backed cache layer (6h stats, 1h leaderboard, 24h profiles).
- **Hardened API** — Helmet, CORS, rate limiting, structured logging, Zod validation, global error handler.

## Backend architecture

```
server/src/
├── config/         env, db (pg), redis (ioredis), passport
├── controllers/    auth, user, stats, platform, leaderboard, community, card, badge
├── middlewares/    auth, validate, cache, rateLimit, error
├── services/       github, leetcode, gfg, codeforces, wakatime, devto, score, email
├── models/         user, platform, stats, follow, badge
├── jobs/           queue, worker, refreshStats, weeklyDigest
├── utils/          apiClient (axios + retry), jwt, devScore, formatters, logger, crypto
└── routes/         /api/auth, /api/user, /api/stats, /api/platform, /api/leaderboard,
                   /api/community, /api/card, /api/badge
```

## DevScore formula

```
score (0–1000) = 1000 × Σ wᵢ · normᵢ(metricᵢ)
```

| component  | weight | metric                                   |
| ---------- | ------ | ---------------------------------------- |
| GitHub     | 0.30   | total commits (log-scaled, anchor 5,000) |
| LeetCode   | 0.25   | weighted solves (E×1 + M×3 + H×5)        |
| Wakatime   | 0.20   | hours coded in last 30 days              |
| Codeforces | 0.15   | rating                                   |
| GFG        | 0.10   | coding score                             |

All metrics are normalized to 0–100 first, then weighted. See `server/src/utils/devScore.js`.

## API quick reference

| Method | Path                          | Auth   | Description                       |
| ------ | ----------------------------- | ------ | --------------------------------- |
| GET    | `/api/health`                 | —      | Health check                      |
| GET    | `/api/auth/github`            | —      | Start GitHub OAuth                |
| GET    | `/api/auth/github/callback`   | —      | OAuth callback                    |
| GET    | `/api/auth/me`                | yes    | Current authenticated user        |
| POST   | `/api/auth/logout`            | —      | Clear session cookie              |
| GET    | `/api/user/me`                | yes    | My profile + platforms + badges   |
| PATCH  | `/api/user/me`                | yes    | Update name/bio/visibility        |
| GET    | `/api/user/u/:username`       | maybe  | Public profile                    |
| GET    | `/api/stats/me`               | yes    | Aggregated stats (cached)         |
| GET    | `/api/stats/u/:username`      | maybe  | Aggregated stats for any user     |
| POST   | `/api/stats/refresh`          | yes    | Queue background refresh          |
| GET    | `/api/platform`               | yes    | List my connected platforms       |
| POST   | `/api/platform/connect`       | yes    | Connect a platform                |
| DELETE | `/api/platform/:platform`     | yes    | Disconnect a platform             |
| GET    | `/api/leaderboard`            | —      | `?metric=&limit=&offset=`         |
| POST   | `/api/community/follow/:u`    | yes    | Follow a user                     |
| DELETE | `/api/community/follow/:u`    | yes    | Unfollow                          |
| GET    | `/api/community/feed`         | yes    | Activity from followed users      |
| GET    | `/api/card/:username/svg`     | —      | Shareable SVG card                |
| GET    | `/api/badge/all`              | —      | All available badge definitions   |

## License

MIT
