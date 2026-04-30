# DevPulse — Server

Express + PostgreSQL + Redis + BullMQ backend for [DevPulse](../README.md).

## Scripts

```bash
npm run dev      # nodemon src/server.js
npm start        # node src/server.js
npm run worker   # node src/jobs/worker.js  (BullMQ worker + cron)
npm run migrate  # apply server/sql/schema.sql
```

## Environment

See [.env.example](./.env.example). Required:

| Variable                  | Notes                                       |
| ------------------------- | ------------------------------------------- |
| `DATABASE_URL`            | Postgres connection string                  |
| `JWT_SECRET`              | At least 16 chars                           |
| `GITHUB_CLIENT_ID/SECRET` | OAuth app                                   |
| `ENCRYPTION_KEY`          | 32-byte hex (Wakatime API keys are AES-256) |

Optional but recommended: `REDIS_URL` (caching + jobs), `GITHUB_API_TOKEN` (higher GitHub rate limits, enables GraphQL contributions API).

## How background refreshes work

1. On login or `POST /api/platform/connect`, the controller enqueues a `refresh-user` job.
2. The BullMQ worker (`npm run worker`) picks it up, calls each platform service in `src/services/*`, and stores a snapshot in `stats_snapshots`.
3. After all snapshots are saved, `score.service.recomputeForUser` updates `users.devscore` and `evaluateBadges` awards any newly-earned badges.
4. A cron job (`0 */6 * * *`) refreshes all users every 6 hours; another (`0 9 * * 1`) sends the Monday weekly digest.

## Caching strategy

- Stats GET routes: 6h Redis cache keyed by user ID/username.
- Leaderboard: 1h cache by `(metric, limit, offset)`.
- Public profile: 24h cache.
- The middleware skips caching when Redis is unavailable.

## Security

- JWT in httpOnly cookies, also accepts `Authorization: Bearer …`.
- All requests pass through `helmet`, CORS allowlist (`CLIENT_URL`), and an `express-rate-limit` global limiter (heavy routes use a stricter limiter).
- All Wakatime API keys are encrypted at rest with AES-256-GCM (`utils/crypto.js`).
- Zod validates every request body/query/params via `validate.middleware.js`.
- Global error handler sanitises 5xx responses in production.
