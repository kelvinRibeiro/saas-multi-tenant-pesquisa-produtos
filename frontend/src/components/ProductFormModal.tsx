import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import type { Product, ProductInput } from "../types";
import { Spinner } from "./Spinner";

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
  const [form, setForm] = useState<ProductInput>({
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    price: initial?.price ?? 0,
    category: initial?.category ?? "",
    imageUrl: initial?.imageUrl ?? "",
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(form);
  }

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
            URL da imagem
            <input
              required
              type="url"
              value={form.imageUrl}
              onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
              placeholder="https://..."
              className="rounded-lg border border-line px-3.5 py-2 text-ink outline-none focus:border-primary"
            />
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
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60"
            >
              {saving && <Spinner className="h-4 w-4" />}
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
