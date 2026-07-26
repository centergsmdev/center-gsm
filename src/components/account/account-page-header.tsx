export function AccountPageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="mb-6">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">
        {eyebrow}
      </p>
      <h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
    </header>
  );
}
