const QUOTES = [
  { q: "Talk is cheap. Show me the code.", a: "Linus Torvalds" },
  { q: "Programs must be written for people to read, and only incidentally for machines to execute.", a: "Harold Abelson" },
  { q: "First, solve the problem. Then, write the code.", a: "John Johnson" },
  { q: "Any fool can write code that a computer can understand. Good programmers write code that humans can understand.", a: "Martin Fowler" },
  { q: "Simplicity is the soul of efficiency.", a: "Austin Freeman" },
  { q: "Make it work, make it right, make it fast.", a: "Kent Beck" },
  { q: "Code is like humor. When you have to explain it, it's bad.", a: "Cory House" },
  { q: "Premature optimization is the root of all evil.", a: "Donald Knuth" },
  { q: "The best error message is the one that never shows up.", a: "Thomas Fuchs" },
  { q: "Programming isn't about what you know; it's about what you can figure out.", a: "Chris Pine" },
  { q: "Walking on water and developing software from a specification are easy if both are frozen.", a: "Edward V. Berard" },
  { q: "There are only two hard things in Computer Science: cache invalidation and naming things.", a: "Phil Karlton" },
  { q: "Software is a great combination between artistry and engineering.", a: "Bill Gates" },
  { q: "It's not a bug — it's an undocumented feature.", a: "Anonymous" },
  { q: "If debugging is the process of removing software bugs, then programming must be the process of putting them in.", a: "Edsger W. Dijkstra" },
  { q: "Truth can only be found in one place: the code.", a: "Robert C. Martin" },
  { q: "Computers are good at following instructions, but not at reading your mind.", a: "Donald Knuth" },
  { q: "The most important property of a program is whether it accomplishes the intention of its user.", a: "C.A.R. Hoare" },
  { q: "A user interface is like a joke. If you have to explain it, it's not that good.", a: "Martin LeBlanc" },
  { q: "When in doubt, use brute force.", a: "Ken Thompson" },
  { q: "Don't comment bad code — rewrite it.", a: "Brian Kernighan" },
  { q: "Programs are meant to be read by humans and only incidentally for computers to execute.", a: "Donald Knuth" },
  { q: "Good code is its own best documentation.", a: "Steve McConnell" },
  { q: "Why do programmers prefer dark mode? Because light attracts bugs.", a: "Anonymous" },
  { q: "Optimism is an occupational hazard of programming; feedback is the treatment.", a: "Kent Beck" },
  { q: "The function of good software is to make the complex appear to be simple.", a: "Grady Booch" },
  { q: "Hardware: the parts of a computer that can be kicked.", a: "Jeff Pesis" },
  { q: "Before software can be reusable it first has to be usable.", a: "Ralph Johnson" },
  { q: "Coding is today's language of creativity.", a: "Maria Klawe" },
  { q: "The best way to predict the future is to invent it.", a: "Alan Kay" },
];

function dayOfYear(d = new Date()) {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  const diff = d.getTime() - start;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export default function QuoteOfTheDay() {
  const idx = dayOfYear() % QUOTES.length;
  const { q, a } = QUOTES[idx];

  return (
    <div className="panel-pad relative overflow-hidden">
      <div
        className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-30"
        style={{ background: "linear-gradient(135deg, #A78BFA, #22d3ee)" }}
      />
      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] uppercase tracking-[0.18em] text-ink-faint">
            Quote of the day
          </span>
          <span className="text-[10px] text-ink-faint">·</span>
          <span className="text-[10px] tabular-nums text-ink-faint">
            #{idx + 1}/{QUOTES.length}
          </span>
        </div>
        <blockquote
          className="font-display italic text-ink leading-snug text-[15px]"
          style={{ textShadow: "0 0 14px rgba(167,139,250,0.18)" }}
        >
          &ldquo;{q}&rdquo;
        </blockquote>
        <div className="mt-2 text-xs text-ink-muted">— {a}</div>
      </div>
    </div>
  );
}
