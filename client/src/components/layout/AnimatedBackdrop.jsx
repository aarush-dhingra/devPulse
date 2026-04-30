import { useEffect, useRef } from "react";

/**
 * Subtle floating-dot ambience for the dashboard. ~40 particles, parallax-light,
 * pauses when the tab isn't visible, throttled to 30 FPS so it never burns CPU.
 */
export default function AnimatedBackdrop({ count = 40, opacity = 0.18 }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    let raf = 0;
    let running = true;
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    const resize = () => {
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx.scale(dpr, dpr);
    };

    const make = () =>
      Array.from({ length: count }, () => ({
        x: Math.random() * canvas.clientWidth,
        y: Math.random() * canvas.clientHeight,
        r: 0.6 + Math.random() * 1.6,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        hue: Math.random() < 0.5 ? "139,92,246" : "34,211,238",
        a: 0.4 + Math.random() * 0.6,
      }));

    let particles = make();
    resize();
    const onResize = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      resize();
      particles = make();
    };
    window.addEventListener("resize", onResize);

    let last = 0;
    const loop = (t) => {
      if (!running) return;
      raf = requestAnimationFrame(loop);
      if (t - last < 33) return;
      last = t;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;
        ctx.beginPath();
        ctx.fillStyle = `rgba(${p.hue}, ${p.a * opacity * 2})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    raf = requestAnimationFrame(loop);

    const onVis = () => {
      running = !document.hidden;
      if (running) raf = requestAnimationFrame(loop);
      else cancelAnimationFrame(raf);
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [count, opacity]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10"
      style={{ opacity }}
    />
  );
}
