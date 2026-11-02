export function ContentWidth({
  children,
  max = 1080,
  className = "",
}: {
  children: React.ReactNode;
  max?: number;
  className?: string;
}) {
  return (
    <div className="mx-auto px-4 sm:px-8" style={{ maxWidth: max }}>
      <div className={className}>{children}</div>
    </div>
  );
}
