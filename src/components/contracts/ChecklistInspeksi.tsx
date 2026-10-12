import { useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ImagePlus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ambilTemplateChecklist,
  hapusFotoChecklist,
  OPSI_KONDISI,
  simpanItemChecklist,
  siapkanChecklistDariTemplate,
  unggahFotoChecklist,
  urlFotoInspeksi,
  type ChecklistKontrak,
  type FotoChecklist,
  type JenisChecklist,
} from "@/lib/contracts";

const LABEL_KATEGORI: Record<string, string> = {
  eksterior: "Eksterior",
  interior: "Interior",
  mesin: "Mesin",
  kelengkapan: "Kelengkapan",
  lainnya: "Lainnya",
};

export function ChecklistInspeksi({
  contractId,
  jenis,
  judul,
  item,
  foto,
  bolehUbah,
  onPerbarui,
}: {
  contractId: string;
  jenis: JenisChecklist;
  judul: string;
  item: ChecklistKontrak[];
  foto: Record<string, FotoChecklist[]>;
  bolehUbah: boolean;
  onPerbarui: () => void;
}) {
  const [templateId, setTemplateId] = useState("");

  const template = useQuery({
    queryKey: ["checklist-template"],
    queryFn: ambilTemplateChecklist,
  });

  const semuaPath = Object.values(foto)
    .flat()
    .map((f) => f.photo_url);
  const urlFoto = useQuery({
    queryKey: ["checklist-foto-url", semuaPath.join("|")],
    queryFn: () => urlFotoInspeksi(semuaPath),
    enabled: semuaPath.length > 0,
  });

  const buat = useMutation({
    mutationFn: () =>
      siapkanChecklistDariTemplate(
        contractId,
        jenis,
        templateId || (template.data?.[0]?.template.id ?? ""),
      ),
    onSuccess: () => {
      toast.success("Checklist disiapkan dari template.");
      onPerbarui();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const simpan = useMutation({
    mutationFn: (v: { id: string; condition: string; notes: string | null }) =>
      simpanItemChecklist(v.id, { condition: v.condition, notes: v.notes }),
    onSuccess: () => onPerbarui(),
    onError: (e: Error) => toast.error(e.message),
  });

  const hapusFoto = useMutation({
    mutationFn: (f: FotoChecklist) => hapusFotoChecklist(f),
    onSuccess: () => {
      toast.success("Foto dihapus.");
      onPerbarui();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (item.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="font-heading text-lg font-bold text-foreground">{judul}</h3>
        <p className="mt-2 text-base text-muted-foreground">
          Belum ada pemeriksaan. Pilih template lalu siapkan daftar pemeriksaan.
        </p>
        {bolehUbah && (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="space-y-2">
              <Label htmlFor={`tpl-${jenis}`} className="text-base">
                Template Pemeriksaan
              </Label>
              <Select
                value={templateId || (template.data?.[0]?.template.id ?? "")}
                onValueChange={setTemplateId}
              >
                <SelectTrigger id={`tpl-${jenis}`} className="h-11 min-w-64 text-base">
                  <SelectValue placeholder="Pilih template" />
                </SelectTrigger>
                <SelectContent>
                  {(template.data ?? []).map((t) => (
                    <SelectItem key={t.template.id} value={t.template.id} className="text-base">
                      {t.template.name} ({t.item.length} item)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              size="lg"
              className="text-base"
              onClick={() => buat.mutate()}
              disabled={buat.isPending || (template.data ?? []).length === 0}
            >
              {buat.isPending ? "Menyiapkan…" : "Siapkan Checklist"}
            </Button>
          </div>
        )}
      </div>
    );
  }

  const kategori = [...new Set(item.map((i) => i.category))];

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h3 className="font-heading text-lg font-bold text-foreground">{judul}</h3>
      <div className="mt-4 space-y-6">
        {kategori.map((k) => (
          <div key={k}>
            <p className="text-base font-semibold text-primary">{LABEL_KATEGORI[k] ?? k}</p>
            <ul className="mt-2 space-y-3">
              {item
                .filter((i) => i.category === k)
                .map((i) => (
                  <BarisItem
                    key={i.id}
                    item={i}
                    foto={foto[i.id] ?? []}
                    url={urlFoto.data ?? {}}
                    bolehUbah={bolehUbah}
                    contractId={contractId}
                    onSimpan={(condition, notes) =>
                      simpan.mutate({ id: i.id, condition, notes })
                    }
                    onHapusFoto={(f) => hapusFoto.mutate(f)}
                    onPerbarui={onPerbarui}
                  />
                ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarisItem({
  item,
  foto,
  url,
  bolehUbah,
  contractId,
  onSimpan,
  onHapusFoto,
  onPerbarui,
}: {
  item: ChecklistKontrak;
  foto: FotoChecklist[];
  url: Record<string, string>;
  bolehUbah: boolean;
  contractId: string;
  onSimpan: (condition: string, notes: string | null) => void;
  onHapusFoto: (f: FotoChecklist) => void;
  onPerbarui: () => void;
}) {
  const [kondisi, setKondisi] = useState(item.condition);
  const [catatan, setCatatan] = useState(item.notes ?? "");
  const berkas = useRef<HTMLInputElement>(null);

  const unggah = useMutation({
    mutationFn: (file: File) => unggahFotoChecklist(contractId, item.id, file, null),
    onSuccess: () => {
      toast.success("Foto ditambahkan.");
      onPerbarui();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <li className="rounded-md border border-border p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-base font-medium text-foreground">
          {item.item_name}
          {item.is_required && <span className="ml-1 text-destructive">*</span>}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={kondisi}
            onValueChange={(v) => {
              setKondisi(v);
              onSimpan(v, catatan.trim() === "" ? null : catatan.trim());
            }}
            disabled={!bolehUbah}
          >
            <SelectTrigger className="h-10 w-36 text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OPSI_KONDISI.map((o) => (
                <SelectItem key={o} value={o} className="text-base capitalize">
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            className="h-10 w-52 text-base"
            placeholder="Catatan"
            value={catatan}
            disabled={!bolehUbah}
            onChange={(e) => setCatatan(e.target.value)}
            onBlur={() => onSimpan(kondisi, catatan.trim() === "" ? null : catatan.trim())}
          />
          {bolehUbah && (
            <>
              <input
                ref={berkas}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) unggah.mutate(f);
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 text-base"
                onClick={() => berkas.current?.click()}
                disabled={unggah.isPending}
              >
                <ImagePlus className="mr-1 size-4" /> Foto
              </Button>
            </>
          )}
        </div>
      </div>

      {foto.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-3">
          {foto.map((f) => (
            <li key={f.id} className="relative">
              <img
                src={url[f.photo_url] ?? ""}
                alt={`Foto inspeksi ${item.item_name}`}
                loading="lazy"
                className="size-24 rounded-md border border-border object-cover"
              />
              {bolehUbah && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="absolute -right-2 -top-2 size-7"
                  aria-label="Hapus foto"
                  onClick={() => onHapusFoto(f)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}