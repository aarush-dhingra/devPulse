# DevPulse — Client

React 18 + Vite + Tailwind frontend for [DevPulse](../README.md).

## Scripts

```bash
npm run dev      # vite dev server (port 5173)
npm run build    # production build → dist/
npm run preview  # preview the built bundle
```

## Environment

```bash
cp .env.example .env
# VITE_API_BASE_URL=http://localhost:5000/api
```

## Architecture

```
src/
├── api/          axios instance + per-resource API modules
├── components/
│   ├── layout/      Navbar, Sidebar, Footer
│   ├── dashboard/   StatCard, DevScoreCard, ContributionHeatmap, LanguageRadar,
│   │                CodingHoursChart, SolveBreakdown, ActivityFeed,
│   │                StreakTracker, PlatformBadges
│   ├── community/   LeaderboardTable, DevCard, FollowButton, CommunityFeed
│   ├── profile/     ConnectPlatform, EditProfile, ShareCard
│   └── ui/          Button, Badge, Modal, Tooltip, Spinner, EmptyState
├── pages/        Landing, Dashboard, PublicProfile, Leaderboard,
│                 Community, Settings, DevWrapped, NotFound
├── store/        authStore, statsStore, communityStore (Zustand)
├── hooks/        useAuth, useStats, usePlatforms, useLeaderboard, useDebounce
├── utils/        formatters, scoreUtils, chartConfigs, constants
└── styles/       index.css (Tailwind + custom CSS vars)
```

## Routes

- `/` — Landing
- `/login` — redirects to `/`
- `/dashboard` — auth required
- `/settings` — auth required
- `/community` — auth required
- `/wrapped` — auth required
- `/leaderboard` — public
- `/u/:username` — public profile

## Notes

- All Recharts components are wrapped in `<ResponsiveContainer>`.
- The shareable card is fetched directly as an SVG image from the backend (`/api/card/:username/svg`); Satori is also a dependency for client-side fallbacks.
- Auth uses cookies; `axiosInstance` sets `withCredentials: true` and listens for 401s.
