import clsx from "clsx";

export default function Button({
  children,
  variant = "primary",
  size = "md",
  className,
  loading = false,
  ...rest
}) {
  const variants = {
    primary: "btn-primary",
    ghost: "btn-ghost",
    outline: "btn-outline",
  };
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-3 text-base",
  };
  return (
    <button
      className={clsx(variants[variant], sizes[size], className)}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-1 h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
          <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        </svg>
      )}
      {children}
    </button>
  );
}
