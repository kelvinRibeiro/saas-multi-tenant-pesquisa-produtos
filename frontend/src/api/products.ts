import { apiClient } from "./client";
import type { Product, ProductInput } from "../types";

export async function listProducts(): Promise<Product[]> {
  const { data } = await apiClient.get<Product[]>("/products");
  return data;
}

export async function createProduct(input: ProductInput): Promise<Product> {
  const { data } = await apiClient.post<Product>("/products", input);
  return data;
}

export async function updateProduct(id: string, input: ProductInput): Promise<Product> {
  const { data } = await apiClient.put<Product>(`/products/${id}`, input);
  return data;
}

export async function deleteProduct(id: string): Promise<void> {
  await apiClient.delete(`/products/${id}`);
}

export async function uploadProductImage(file: File): Promise<{ imageUrl: string }> {
  const formData = new FormData();
  formData.append("image", file);
  const { data } = await apiClient.post<{ imageUrl: string }>("/products/images", formData);
  return data;
}
