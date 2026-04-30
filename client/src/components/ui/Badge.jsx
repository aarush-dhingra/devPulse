import clsx from "clsx";

export default function Badge({ children, color, className, icon, title }) {
  return (
    <span
      className={clsx(
        "pill",
        className
      )}
      title={title}
      style={
        color
          ? {
              background: `${color}1a`,
              borderColor: `${color}40`,
              color,
            }
          : undefined
      }
    >
      {icon && <span aria-hidden>{icon}</span>}
      {children}
    </span>
  );
}
