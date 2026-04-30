export default function EmptyState({ icon = "🪐", title, description, action }) {
  return (
    <div className="text-center py-10 px-6">
      <div className="text-4xl mb-3" aria-hidden>
        {icon}
      </div>
      {title && <h3 className="text-lg font-semibold">{title}</h3>}
      {description && (
        <p className="mt-1 text-sm text-ink-muted max-w-sm mx-auto">
          {description}
        </p>
      )}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
