import { useState, type ChangeEvent, type FormEvent } from "react";
import { ImagePlus, X } from "lucide-react";
import toast from "react-hot-toast";
import { uploadProductImage } from "../api/products";
import type { Product, ProductInput } from "../types";
import { Spinner } from "./Spinner";

const ACCEPTED_TYPES = "image/jpeg,image/png,image/webp,image/gif";

export function ProductFormModal({
  initial,
  saving,
  onClose,
  onSubmit,
}: {
  initial: Product | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (input: ProductInput) => void;
}) {
  const [form, setForm] = useState<Omit<ProductInput, "imageUrl">>({
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    price: initial?.price ?? 0,
    category: initial?.category ?? "",
  });
  const [imageUrl] = useState(initial?.imageUrl ?? "");
  const [previewUrl, setPreviewUrl] = useState(initial?.imageUrl ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    let finalImageUrl = imageUrl;

    if (file) {
      setUploading(true);
      try {
        const res = await uploadProductImage(file);
        finalImageUrl = res.imageUrl;
      } catch {
        toast.error("Não foi possível enviar a imagem. Tente novamente.");
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    if (!finalImageUrl) {
      toast.error("Selecione uma imagem para o produto.");
      return;
    }

    onSubmit({ ...form, imageUrl: finalImageUrl });
  }

  const busy = saving || uploading;

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-ink/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">
            {initial ? "Editar produto" : "Novo produto"}
          </h2>
          <button onClick={onClose} className="text-ink-faint hover:text-ink">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-soft">
            Nome
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="rounded-lg border border-line px-3.5 py-2 text-ink outline-none focus:border-primary"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-soft">
            Descrição
            <textarea
              required
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="resize-none rounded-lg border border-line px-3.5 py-2 text-ink outline-none focus:border-primary"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-soft">
              Preço (R$)
              <input
                type="number"
                required
                min={0}
                step="0.01"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
                className="rounded-lg border border-line px-3.5 py-2 text-ink outline-none focus:border-primary"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-soft">
              Categoria
              <input
                required
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="rounded-lg border border-line px-3.5 py-2 text-ink outline-none focus:border-primary"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-soft">
            Imagem
            <div className="flex items-center gap-3">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="h-16 w-16 rounded-lg border border-line object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-line text-ink-faint">
                  <ImagePlus size={20} />
                </div>
              )}
              <input
                type="file"
                accept={ACCEPTED_TYPES}
                onChange={handleFileChange}
                className="flex-1 text-sm text-ink-soft file:mr-3 file:rounded-lg file:border-0 file:bg-primary-soft file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-dark hover:file:bg-primary-soft/80"
              />
            </div>
            <span className="text-xs font-normal text-ink-faint">JPEG, PNG, WEBP ou GIF — até 5MB.</span>
          </label>

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-soft hover:bg-paper-2"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60"
            >
              {busy && <Spinner className="h-4 w-4" />}
              {uploading ? "Enviando imagem..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
