import { Router } from "express";
import { authenticate, requireAdmin } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { listProducts, createProduct, updateProduct, deleteProduct } from "../controllers/product.controller";

const router = Router();

router.use(authenticate);

router.get("/", asyncHandler(listProducts));
router.post("/", requireAdmin, asyncHandler(createProduct));
router.put("/:id", requireAdmin, asyncHandler(updateProduct));
router.delete("/:id", requireAdmin, asyncHandler(deleteProduct));

export default router;
