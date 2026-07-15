import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { Request, Response, NextFunction } from "express";

export const UPLOADS_ROOT = path.join(process.cwd(), "uploads");
export const PRODUCT_UPLOADS_DIR = path.join(UPLOADS_ROOT, "products");
fs.mkdirSync(PRODUCT_UPLOADS_DIR, { recursive: true });

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, PRODUCT_UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new Error("Tipo de arquivo não suportado. Envie JPEG, PNG, WEBP ou GIF."));
      return;
    }
    cb(null, true);
  },
}).single("image");

// Invoca o multer manualmente (em vez de usá-lo direto como middleware da rota)
// para converter os erros dele (tipo inválido, arquivo grande demais) em uma
// resposta 400 com mensagem clara, em vez de cair no handler de erro genérico.
export function uploadSingleProductImage(req: Request, res: Response, next: NextFunction): void {
  upload(req, res, (err: unknown) => {
    if (!err) {
      next();
      return;
    }

    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({ error: "Imagem maior que o limite de 5MB." });
      return;
    }

    const message = err instanceof Error ? err.message : "Falha ao processar o upload.";
    res.status(400).json({ error: message });
  });
}

/**
 * Remove do disco um arquivo de imagem enviado por upload, se (e somente se)
 * a URL apontar para dentro de /uploads/products/ — nunca tenta apagar uma
 * URL externa (ex: imagens de seed hospedadas em picsum.photos).
 */
export async function deleteUploadedImageIfLocal(imageUrl: string): Promise<void> {
  let pathname: string;
  try {
    pathname = new URL(imageUrl).pathname;
  } catch {
    return;
  }

  const prefix = "/uploads/products/";
  if (!pathname.startsWith(prefix)) {
    return;
  }

  const filename = path.basename(pathname);
  const filePath = path.join(PRODUCT_UPLOADS_DIR, filename);

  try {
    await fs.promises.unlink(filePath);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("[upload] falha ao remover arquivo órfão:", filePath, err);
    }
  }
}
