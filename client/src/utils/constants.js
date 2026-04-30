export const PLATFORMS = [
  {
    id: "github",
    name: "GitHub",
    color: "#f0f6fc",
    bg: "#161b22",
    icon: "🐙",
    inputLabel: "GitHub username",
    needsApiKey: false,
  },
  {
    id: "leetcode",
    name: "LeetCode",
    color: "#ffa116",
    bg: "#1a1a1a",
    icon: "🧩",
    inputLabel: "LeetCode username",
    needsApiKey: false,
  },
  {
    id: "gfg",
    name: "GeeksForGeeks",
    color: "#2f8d46",
    bg: "#0f1f15",
    icon: "🧠",
    inputLabel: "GFG username",
    needsApiKey: false,
  },
  {
    id: "codeforces",
    name: "Codeforces",
    color: "#fe646f",
    bg: "#1c1f2e",
    icon: "🏆",
    inputLabel: "Codeforces handle",
    needsApiKey: false,
  },
  {
    id: "wakatime",
    name: "Wakatime",
    color: "#00b8a9",
    bg: "#0e1f1d",
    icon: "⏱️",
    inputLabel: "Wakatime username",
    needsApiKey: true,
  },
  {
    id: "devto",
    name: "Dev.to",
    color: "#ffffff",
    bg: "#0a0a0a",
    icon: "✍️",
    inputLabel: "Dev.to username",
    needsApiKey: false,
  },
];

export const PLATFORM_BY_ID = Object.fromEntries(PLATFORMS.map((p) => [p.id, p]));

export const ROUTES = {
  landing: "/",
  dashboard: "/dashboard",
  settings: "/settings",
  leaderboard: "/leaderboard",
  community: "/community",
  wrapped: "/wrapped",
  profile: (u) => `/u/${u}`,
};

export const LANG_COLORS = {
  JavaScript: "#f7df1e",
  TypeScript: "#3178c6",
  Python: "#3572a5",
  Java: "#b07219",
  Go: "#00add8",
  Rust: "#dea584",
  "C++": "#f34b7d",
  C: "#555555",
  Ruby: "#701516",
  PHP: "#4f5d95",
  Swift: "#f05138",
  Kotlin: "#a97bff",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Shell: "#89e051",
  Vue: "#41b883",
  Dart: "#00b4ab",
  Lua: "#000080",
};

export const colorForLang = (name) =>
  LANG_COLORS[name] || `hsl(${hashString(name) % 360}, 60%, 60%)`;

function hashString(s = "") {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}
