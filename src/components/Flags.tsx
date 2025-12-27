type Props = {
  flags?: string[];
};

export default function Flags({ flags }: Props) {
  if (!flags || flags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 text-xs text-neutral-300">
      {flags.map((f) => (
        <span
          key={f}
          className="rounded-md border border-neutral-600 px-2 py-1 bg-neutral-800"
        >
          {f}
        </span>
      ))}
    </div>
  );
}
