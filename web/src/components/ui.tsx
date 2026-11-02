export function SectionHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 pt-14 pb-5">
      <div>
        <h2 className="text-2xl font-black">{title}</h2>
        {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function InfoCard({
  icon,
  title,
  body,
  width = 320,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  width?: number;
}) {
  return (
    <div className="rounded-2xl bg-outline/40 p-5.5" style={{ maxWidth: width, minWidth: 240 }}>
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">{icon}</div>
      <p className="mt-3.5 text-[15px] font-extrabold">{title}</p>
      <p className="mt-1 text-sm text-muted">{body}</p>
    </div>
  );
}

export function ErrorRetry({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <p className="text-muted">{message}</p>
    </div>
  );
}
