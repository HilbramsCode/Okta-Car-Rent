import { waktuRelatif } from "@/lib/format";
import type { Notifikasi } from "@/lib/notifications";

export function ItemNotifikasi({
  notifikasi,
  onKlik,
}: {
  notifikasi: Notifikasi;
  onKlik: (n: Notifikasi) => void;
}) {
  const belumDibaca = !notifikasi.is_read;

  return (
    <button
      type="button"
      onClick={() => onKlik(notifikasi)}
      className={`w-full border-b border-border px-4 py-3 text-left last:border-0 hover:bg-secondary ${
        belumDibaca ? "bg-secondary/60" : "bg-transparent"
      }`}
    >
      <div className="flex items-start gap-2">
        {belumDibaca ? (
          <span
            aria-hidden="true"
            className="mt-2 size-2 shrink-0 rounded-full bg-primary"
          />
        ) : (
          <span aria-hidden="true" className="mt-2 size-2 shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <p
            className={`text-base text-foreground ${belumDibaca ? "font-semibold" : "font-medium"}`}
          >
            {notifikasi.title}
            {belumDibaca ? <span className="sr-only"> (belum dibaca)</span> : null}
          </p>
          <p className="mt-0.5 text-base text-muted-foreground">{notifikasi.message}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {waktuRelatif(notifikasi.created_at)}
          </p>
        </div>
      </div>
    </button>
  );
}
