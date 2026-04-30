export function PageHero({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="mb-10 max-w-3xl space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
        {eyebrow}
      </p>
      <h1 className="text-3xl font-semibold leading-[1.15] tracking-tight sm:text-[40px]">
        {title}
      </h1>
      <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
        {description}
      </p>
    </header>
  );
}
