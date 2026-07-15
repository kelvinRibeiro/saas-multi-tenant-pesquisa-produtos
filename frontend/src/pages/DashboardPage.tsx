import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, PackageSearch } from "lucide-react";
import toast from "react-hot-toast";
import * as productsApi from "../api/products";
import { useAuth } from "../context/AuthContext";
import { ProductCard } from "../components/ProductCard";
import { ProductFormModal } from "../components/ProductFormModal";
import { Spinner } from "../components/Spinner";
import type { Product, ProductInput } from "../types";

export function DashboardPage() {
  const { session } = useAuth();
  const isAdmin = session?.user.role === "admin";
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Product | null | undefined>(undefined);

  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: productsApi.listProducts,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["products"] });

  const createMutation = useMutation({
    mutationFn: productsApi.createProduct,
    onSuccess: () => {
      toast.success("Produto criado.");
      invalidate();
      setEditing(undefined);
    },
    onError: () => toast.error("Não foi possível criar o produto."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ProductInput }) => productsApi.updateProduct(id, input),
    onSuccess: () => {
      toast.success("Produto atualizado.");
      invalidate();
      setEditing(undefined);
    },
    onError: () => toast.error("Não foi possível atualizar o produto."),
  });

  const deleteMutation = useMutation({
    mutationFn: productsApi.deleteProduct,
    onSuccess: () => {
      toast.success("Produto excluído.");
      invalidate();
    },
    onError: () => toast.error("Não foi possível excluir o produto."),
  });

  function handleSubmit(input: ProductInput) {
    if (editing) {
      updateMutation.mutate({ id: editing._id, input });
    } else {
      createMutation.mutate(input);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Produtos</h1>
          <p className="text-sm text-ink-soft">
            Catálogo de <span className="font-medium">{session?.company.name}</span>
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setEditing(null)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
          >
            <Plus size={16} /> Novo produto
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-24 text-primary">
          <Spinner className="h-8 w-8" />
        </div>
      ) : products && products.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard
              key={product._id}
              product={product}
              canManage={isAdmin}
              onEdit={() => setEditing(product)}
              onDelete={() => {
                if (confirm(`Excluir "${product.name}"?`)) deleteMutation.mutate(product._id);
              }}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-line py-24 text-center">
          <PackageSearch className="text-ink-faint" size={32} />
          <p className="text-ink-soft">
            {isAdmin ? "Nenhum produto cadastrado ainda." : "Esta empresa ainda não tem produtos cadastrados."}
          </p>
        </div>
      )}

      {editing !== undefined && (
        <ProductFormModal
          initial={editing}
          saving={createMutation.isPending || updateMutation.isPending}
          onClose={() => setEditing(undefined)}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
