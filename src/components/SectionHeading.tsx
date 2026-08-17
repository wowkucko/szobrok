export default function SectionHeading({
  index,
  title,
  subtitle,
}: {
  index: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="max-w-2xl">
      <span className="font-mono text-sm text-amber-500/80">{index}</span>
      <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 text-lg leading-8 text-zinc-400">{subtitle}</p>
      )}
    </div>
  );
}
