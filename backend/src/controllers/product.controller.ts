import { Request, Response } from "express";
import * as productService from "../services/product.service";

export async function listProducts(req: Request, res: Response): Promise<void> {
  const { query, category, maxPrice } = req.query;
  const products = await productService.findProducts(req.user!.companyId, {
    query: typeof query === "string" ? query : undefined,
    category: typeof category === "string" ? category : undefined,
    maxPrice: typeof maxPrice === "string" ? Number(maxPrice) : undefined,
  });
  res.json(products);
}

export async function createProduct(req: Request, res: Response): Promise<void> {
  const { name, description, price, category, imageUrl } = req.body ?? {};
  if (!name || !description || price == null || !category || !imageUrl) {
    res.status(400).json({ error: "name, description, price, category e imageUrl são obrigatórios." });
    return;
  }

  const product = await productService.createProduct(req.user!.companyId, {
    name,
    description,
    price: Number(price),
    category,
    imageUrl,
  });
  res.status(201).json(product);
}

export async function updateProduct(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { name, description, price, category, imageUrl } = req.body ?? {};

  const updated = await productService.updateProduct(req.user!.companyId, id, {
    ...(name !== undefined && { name }),
    ...(description !== undefined && { description }),
    ...(price !== undefined && { price: Number(price) }),
    ...(category !== undefined && { category }),
    ...(imageUrl !== undefined && { imageUrl }),
  });

  if (!updated) {
    res.status(404).json({ error: "Produto não encontrado." });
    return;
  }
  res.json(updated);
}

export async function deleteProduct(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const deleted = await productService.deleteProduct(req.user!.companyId, id);
  if (!deleted) {
    res.status(404).json({ error: "Produto não encontrado." });
    return;
  }
  res.status(204).send();
}
