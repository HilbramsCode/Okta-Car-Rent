import { cn } from "@/lib/utils";
import { ambilLabel, type Tone } from "@/lib/labels";

const toneClass: Record<Tone, string> = {
  netral: "bg-muted text-muted-foreground border-border",
  sukses: "bg-success/10 text-success border-success/30",
  peringatan: "bg-warning/15 text-warning-foreground border-warning/40",
  bahaya: "bg-destructive/10 text-destructive border-destructive/30",
  info: "bg-info/10 text-info border-info/30",
};

export function StatusBadge({
  map,
  value,
  className,
}: {
  map: Record<string, { label: string; tone: Tone }>;
  value: string | null | undefined;
  className?: string;
}) {
  const { label, tone } = ambilLabel(map, value);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-sm font-semibold whitespace-nowrap",
        toneClass[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}