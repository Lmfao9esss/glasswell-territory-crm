"use client";

export function FieldActionBar({
  onBook,
  onComplete,
  onHouse,
  onLead,
  onQuote,
  onSkip,
}: {
  onBook: () => void;
  onComplete: () => void;
  onHouse: () => void;
  onLead: () => void;
  onQuote: () => void;
  onSkip: () => void;
}) {
  return (
    <nav className="absolute inset-x-2 bottom-[4.75rem] z-[1160] mx-auto grid max-w-md grid-cols-6 gap-1 rounded-[24px] border border-white/80 bg-white/95 p-2 text-zinc-950 shadow-2xl shadow-zinc-950/25 backdrop-blur">
      <ActionBarButton label="House" onClick={onHouse} />
      <ActionBarButton label="Lead" onClick={onLead} />
      <ActionBarButton label="Quote" onClick={onQuote} />
      <ActionBarButton label="Book" onClick={onBook} />
      <ActionBarButton label="Skip" onClick={onSkip} />
      <ActionBarButton label="Done" onClick={onComplete} />
    </nav>
  );
}

function ActionBarButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="h-14 rounded-2xl bg-zinc-100 px-1 text-xs font-black active:scale-95"
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  );
}
