import { Pencil, Trash2 } from "lucide-react";
import type { Product } from "../types";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function ProductCard({
  product,
  canManage,
  onEdit,
  onDelete,
}: {
  product: Product;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-line bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="relative aspect-[4/3] overflow-hidden bg-paper-2">
        <img
          src={product.imageUrl}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="price-tag absolute top-3 right-0 flex items-center bg-accent py-1.5 pr-3 pl-4 font-mono text-sm font-medium text-white shadow-sm">
          <span className="absolute top-1/2 left-2 h-1 w-1 -translate-y-1/2 rounded-full bg-white/70" />
          {currency.format(product.price)}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display font-semibold text-ink">{product.name}</h3>
        </div>
        <span className="w-fit rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary-dark">
          {product.category}
        </span>
        <p className="line-clamp-2 text-sm text-ink-soft">{product.description}</p>

        {canManage && (
          <div className="mt-auto flex gap-2 pt-3">
            <button
              onClick={onEdit}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-line py-1.5 text-sm font-medium text-ink-soft transition-colors hover:border-primary hover:text-primary"
            >
              <Pencil size={14} /> Editar
            </button>
            <button
              onClick={onDelete}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-line py-1.5 text-sm font-medium text-ink-soft transition-colors hover:border-danger hover:text-danger"
            >
              <Trash2 size={14} /> Excluir
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
