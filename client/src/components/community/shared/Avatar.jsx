/**
 * Avatar component — shows user avatar with fallback initials.
 * Props: src, name, size (number in px, default 36)
 */
export default function Avatar({ src, name = "", size = 36, className = "" }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

  const style = { width: size, height: size, minWidth: size, minHeight: size, fontSize: size * 0.38 };

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        style={style}
        className={`rounded-full object-cover bg-white/5 ${className}`}
        onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.nextSibling.style.display = "flex"; }}
      />
    );
  }

  return (
    <div
      style={style}
      className={`rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold select-none shrink-0 ${className}`}
    >
      {initials || "?"}
    </div>
  );
}
