import { FilterQuery } from "mongoose";
import { Product, IProduct } from "../models/Product";

export interface ProductFilters {
  query?: string;
  category?: string;
  maxPrice?: number;
}

/**
 * Ponto único de leitura de produtos. companyId vem sempre de req.user
 * (nunca de input do cliente ou do modelo de IA) — é o que garante o
 * isolamento entre tenants.
 */
export async function findProducts(companyId: string, filters: ProductFilters = {}): Promise<IProduct[]> {
  const mongoFilter: FilterQuery<IProduct> = { companyId };

  if (filters.category) {
    mongoFilter.category = new RegExp(`^${escapeRegExp(filters.category)}$`, "i");
  }
  if (typeof filters.maxPrice === "number") {
    mongoFilter.price = { $lte: filters.maxPrice };
  }
  if (filters.query) {
    const regex = new RegExp(escapeRegExp(filters.query), "i");
    mongoFilter.$or = [{ name: regex }, { description: regex }, { category: regex }];
  }

  return Product.find(mongoFilter).sort({ createdAt: -1 }).limit(30);
}

export async function findProductById(companyId: string, productId: string): Promise<IProduct | null> {
  return Product.findOne({ _id: productId, companyId });
}

export async function createProduct(
  companyId: string,
  data: Pick<IProduct, "name" | "description" | "price" | "category" | "imageUrl">,
): Promise<IProduct> {
  return Product.create({ ...data, companyId });
}

export async function updateProduct(
  companyId: string,
  productId: string,
  data: Partial<Pick<IProduct, "name" | "description" | "price" | "category" | "imageUrl">>,
): Promise<IProduct | null> {
  // findOneAndUpdate por _id + companyId: impede editar produto de outra empresa mesmo sabendo o ID.
  return Product.findOneAndUpdate({ _id: productId, companyId }, data, { new: true, runValidators: true });
}

export async function deleteProduct(companyId: string, productId: string): Promise<boolean> {
  const result = await Product.findOneAndDelete({ _id: productId, companyId });
  return result !== null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
