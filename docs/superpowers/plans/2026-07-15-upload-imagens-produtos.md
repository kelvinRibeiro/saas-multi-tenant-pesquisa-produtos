# Upload de Imagens no Cadastro de Produtos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o campo de texto "URL da imagem" no cadastro de produtos por upload real de
arquivo, com armazenamento em disco no backend e limpeza automática de arquivos órfãos.

**Architecture:** Endpoint dedicado `POST /api/products/images` (multer, disco local, admin-only)
que devolve uma URL absoluta; o frontend sobe a imagem primeiro e só então chama o
create/update de produto existente (JSON, inalterado). `product.service.ts` passa a apagar o
arquivo antigo do disco quando a imagem de um produto é substituída ou o produto é excluído — mas
só se a URL antiga apontar para um upload local nosso, nunca para uma URL externa.

**Tech Stack:** Node.js + Express + TypeScript + Multer (backend); React + TypeScript + axios
(frontend). Sem framework de testes automatizados no projeto (nem backend nem frontend) — a
verificação de cada task é manual, via `curl` e/ou navegador, seguindo o padrão já estabelecido
no restante do projeto (documentado no README como limitação conhecida).

## Global Constraints

- Tipos de imagem aceitos: `image/jpeg`, `image/png`, `image/webp`, `image/gif`.
- Tamanho máximo de arquivo: 5MB (`5 * 1024 * 1024` bytes).
- `imageUrl` no schema do `Product` continua sendo uma `string` (URL absoluta) — nenhuma mudança
  de schema/model.
- Upload é admin-only, mesma regra de permissão do resto do CRUD de produtos.
- Nomes de arquivo salvos em disco são sempre gerados via `crypto.randomUUID()` — nunca o nome
  original enviado pelo usuário.

---

### Task 1: Endpoint de upload no backend (multer + rota + estático)

**Files:**
- Create: `backend/src/middleware/upload.ts`
- Modify: `backend/src/controllers/product.controller.ts`
- Modify: `backend/src/routes/product.routes.ts`
- Modify: `backend/src/app.ts`
- Modify: `backend/package.json` (via `npm install`)
- Modify: `.gitignore` (raiz do projeto)

**Interfaces:**
- Produces (usado pela Task 2): `UPLOADS_ROOT: string`, `PRODUCT_UPLOADS_DIR: string`,
  `uploadSingleProductImage(req, res, next): void`, `deleteUploadedImageIfLocal(imageUrl: string): Promise<void>`
  — todos exportados de `backend/src/middleware/upload.ts`.
- Produces: rota `POST /api/products/images` (multipart, campo `image`) → `201 { imageUrl: string }`
  ou `400 { error: string }`.

- [ ] **Step 1: Instalar o multer**

```bash
cd backend
npm install multer
npm install --save-dev @types/multer
```

- [ ] **Step 2: Criar o middleware de upload**

Criar `backend/src/middleware/upload.ts`:

```ts
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
```

- [ ] **Step 3: Adicionar o handler de upload no controller de produtos**

Em `backend/src/controllers/product.controller.ts`, adicionar ao final do arquivo:

```ts
export async function uploadProductImageHandler(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    res.status(400).json({ error: "Nenhum arquivo enviado." });
    return;
  }

  const imageUrl = `${req.protocol}://${req.get("host")}/uploads/products/${req.file.filename}`;
  res.status(201).json({ imageUrl });
}
```

- [ ] **Step 4: Registrar a rota**

Editar `backend/src/routes/product.routes.ts` para o conteúdo completo abaixo:

```ts
import { Router } from "express";
import { authenticate, requireAdmin } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { uploadSingleProductImage } from "../middleware/upload";
import {
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImageHandler,
} from "../controllers/product.controller";

const router = Router();

router.use(authenticate);

router.get("/", asyncHandler(listProducts));
router.post("/", requireAdmin, asyncHandler(createProduct));
router.put("/:id", requireAdmin, asyncHandler(updateProduct));
router.delete("/:id", requireAdmin, asyncHandler(deleteProduct));
router.post("/images", requireAdmin, uploadSingleProductImage, asyncHandler(uploadProductImageHandler));

export default router;
```

- [ ] **Step 5: Servir os arquivos como estático**

Editar `backend/src/app.ts` para o conteúdo completo abaixo:

```ts
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import productRoutes from "./routes/product.routes";
import chatRoutes from "./routes/chat.routes";
import { UPLOADS_ROOT } from "./middleware/upload";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  }),
);
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.use("/uploads", express.static(UPLOADS_ROOT));

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/chat", chatRoutes);

// Handler de erro genérico — cobre exceções não tratadas nos controllers.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  const message = err instanceof Error ? err.message : "Erro interno.";
  res.status(500).json({ error: message });
});

export default app;
```

> **Atenção ao path:** `PRODUCT_UPLOADS_DIR` já inclui a subpasta `products`, mas o estático é
> montado a partir de `UPLOADS_ROOT` (a pasta pai) em `/uploads`. Isso faz `/uploads/products/x.jpg`
> resolver corretamente para `UPLOADS_ROOT/products/x.jpg`. Se o estático fosse montado a partir de
> `PRODUCT_UPLOADS_DIR`, o path ficaria duplicado (`/uploads/products/products/x.jpg`) — não faça
> isso.

- [ ] **Step 6: Ignorar a pasta de uploads no git**

Editar `.gitignore` (raiz do projeto), adicionando a linha `backend/uploads/` ao final do arquivo
existente.

- [ ] **Step 7: Verificar compilação**

```bash
cd backend
npx tsc -p tsconfig.json --noEmit
```

Esperado: nenhuma saída (compila limpo).

- [ ] **Step 8: Verificar manualmente com curl**

Com o backend rodando (`npm run dev`) e depois de logar como admin do seed para pegar um token:

```bash
# gera uma imagem PNG mínima válida pra teste
echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=" | base64 -d > /tmp/test-image.png

TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@techstore.com","password":"senha123"}' | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).token))")

# upload válido
curl -s -X POST http://localhost:4000/api/products/images \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@/tmp/test-image.png;type=image/png"
# Esperado: 201 com {"imageUrl":"http://localhost:4000/uploads/products/<uuid>.png"}

# a URL retornada deve resolver de verdade
IMAGE_URL=$(curl -s -X POST http://localhost:4000/api/products/images -H "Authorization: Bearer $TOKEN" -F "image=@/tmp/test-image.png;type=image/png" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).imageUrl))")
curl -s -o /dev/null -w "%{http_code}\n" "$IMAGE_URL"
# Esperado: 200

# arquivo não-imagem deve ser rejeitado
echo "não é uma imagem" > /tmp/test.txt
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:4000/api/products/images \
  -H "Authorization: Bearer $TOKEN" -F "image=@/tmp/test.txt;type=text/plain"
# Esperado: 400
```

- [ ] **Step 9: Commit**

(Este projeto ainda não tem repositório git inicializado — pule este passo, ou inicialize o
repositório antes se preferir manter histórico a partir daqui.)

---

### Task 2: Limpeza de arquivos órfãos no `product.service.ts`

**Files:**
- Modify: `backend/src/services/product.service.ts`

**Interfaces:**
- Consumes: `deleteUploadedImageIfLocal(imageUrl: string): Promise<void>` de
  `../middleware/upload` (Task 1).
- Produces: `updateProduct` e `deleteProduct` mantêm as mesmas assinaturas já usadas pelo
  `product.controller.ts` — nenhuma mudança de interface externa.

- [ ] **Step 1: Importar a função de limpeza**

No topo de `backend/src/services/product.service.ts`, adicionar:

```ts
import { deleteUploadedImageIfLocal } from "../middleware/upload";
```

- [ ] **Step 2: Atualizar `updateProduct` para apagar a imagem antiga quando substituída**

Substituir a função `updateProduct` existente por:

```ts
export async function updateProduct(
  companyId: string,
  productId: string,
  data: Partial<Pick<IProduct, "name" | "description" | "price" | "category" | "imageUrl">>,
): Promise<IProduct | null> {
  const existing = await Product.findOne({ _id: productId, companyId });
  if (!existing) return null;

  // findOneAndUpdate por _id + companyId: impede editar produto de outra empresa mesmo sabendo o ID.
  const updated = await Product.findOneAndUpdate({ _id: productId, companyId }, data, {
    new: true,
    runValidators: true,
  });

  if (updated && data.imageUrl && data.imageUrl !== existing.imageUrl) {
    await deleteUploadedImageIfLocal(existing.imageUrl);
  }

  return updated;
}
```

- [ ] **Step 3: Atualizar `deleteProduct` para apagar a imagem do produto removido**

Substituir a função `deleteProduct` existente por:

```ts
export async function deleteProduct(companyId: string, productId: string): Promise<boolean> {
  const deleted = await Product.findOneAndDelete({ _id: productId, companyId });
  if (!deleted) return false;

  await deleteUploadedImageIfLocal(deleted.imageUrl);
  return true;
}
```

- [ ] **Step 4: Verificar compilação**

```bash
cd backend
npx tsc -p tsconfig.json --noEmit
```

Esperado: nenhuma saída.

- [ ] **Step 5: Verificar manualmente com curl (substituição de imagem)**

Com backend rodando e `$TOKEN` de admin (igual à Task 1):

```bash
# cria produto com uma imagem local
IMG1=$(curl -s -X POST http://localhost:4000/api/products/images -H "Authorization: Bearer $TOKEN" -F "image=@/tmp/test-image.png;type=image/png" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).imageUrl))")

PRODUCT_ID=$(curl -s -X POST http://localhost:4000/api/products -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"name\":\"Produto Teste Upload\",\"description\":\"desc\",\"price\":10,\"category\":\"Teste\",\"imageUrl\":\"$IMG1\"}" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d)._id))")

echo "imagem 1 antes do update:"; curl -s -o /dev/null -w "%{http_code}\n" "$IMG1"
# Esperado: 200

# atualiza o produto com uma NOVA imagem
IMG2=$(curl -s -X POST http://localhost:4000/api/products/images -H "Authorization: Bearer $TOKEN" -F "image=@/tmp/test-image.png;type=image/png" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).imageUrl))")

curl -s -X PUT "http://localhost:4000/api/products/$PRODUCT_ID" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"imageUrl\":\"$IMG2\"}" > /dev/null

echo "imagem 1 depois do update (deve sumir):"; curl -s -o /dev/null -w "%{http_code}\n" "$IMG1"
# Esperado: 404 (arquivo antigo foi apagado)
echo "imagem 2 depois do update (deve existir):"; curl -s -o /dev/null -w "%{http_code}\n" "$IMG2"
# Esperado: 200

# exclui o produto e confirma que a imagem 2 some
curl -s -X DELETE "http://localhost:4000/api/products/$PRODUCT_ID" -H "Authorization: Bearer $TOKEN" -o /dev/null -w "%{http_code}\n"
# Esperado: 204
echo "imagem 2 depois do delete (deve sumir):"; curl -s -o /dev/null -w "%{http_code}\n" "$IMG2"
# Esperado: 404
```

- [ ] **Step 6: Verificar que produtos com imagem externa (seed) não são afetados**

```bash
# pega um produto do seed (imagem externa picsum.photos)
SEED_PRODUCT=$(curl -s http://localhost:4000/api/products -H "Authorization: Bearer $TOKEN" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const p=JSON.parse(d)[0];console.log(JSON.stringify({id:p._id,imageUrl:p.imageUrl}))})")
echo "$SEED_PRODUCT"

# atualiza só o nome (sem tocar na imagem) — não deve tentar apagar nada nem dar erro
ID=$(echo "$SEED_PRODUCT" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).id))")
curl -s -o /dev/null -w "%{http_code}\n" -X PUT "http://localhost:4000/api/products/$ID" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"Nome Atualizado"}'
# Esperado: 200, sem erro no console do backend
```

- [ ] **Step 7: Commit**

(Sem repositório git neste projeto — pule este passo, como na Task 1.)

---

### Task 3: Função de upload no cliente de API do frontend

**Files:**
- Modify: `frontend/src/api/products.ts`

**Interfaces:**
- Produces (usado pela Task 4): `uploadProductImage(file: File): Promise<{ imageUrl: string }>`.

- [ ] **Step 1: Adicionar a função**

Ao final de `frontend/src/api/products.ts`, adicionar:

```ts
export async function uploadProductImage(file: File): Promise<{ imageUrl: string }> {
  const formData = new FormData();
  formData.append("image", file);
  const { data } = await apiClient.post<{ imageUrl: string }>("/products/images", formData);
  return data;
}
```

- [ ] **Step 2: Verificar compilação**

```bash
cd frontend
npx tsc -b --noEmit
```

Esperado: nenhuma saída.

- [ ] **Step 3: Commit**

(Sem repositório git neste projeto — pule este passo.)

---

### Task 4: Formulário de produto com upload de arquivo e preview

**Files:**
- Modify: `frontend/src/components/ProductFormModal.tsx`

**Interfaces:**
- Consumes: `uploadProductImage(file: File): Promise<{ imageUrl: string }>` de `../api/products`
  (Task 3).
- Produces: nenhuma mudança na interface externa do componente (`initial`, `saving`, `onClose`,
  `onSubmit` continuam com a mesma assinatura) — `DashboardPage.tsx` não precisa de nenhuma
  alteração.

- [ ] **Step 1: Substituir o conteúdo do componente**

Substituir todo o conteúdo de `frontend/src/components/ProductFormModal.tsx` por:

```tsx
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
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? "");
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
```

- [ ] **Step 2: Verificar compilação**

```bash
cd frontend
npx tsc -b --noEmit
```

Esperado: nenhuma saída.

- [ ] **Step 3: Verificar no navegador**

Com backend e frontend rodando, logado como admin:

1. Abrir "Novo produto" → selecionar um arquivo de imagem → confirmar que o preview de 16x16
   aparece ao lado do input assim que o arquivo é escolhido.
2. Preencher os demais campos e salvar → confirmar que o botão mostra "Enviando imagem..." com
   spinner brevemente, depois o modal fecha e o novo card aparece no grid com a imagem enviada
   (a URL da imagem deve ser algo como `http://localhost:4000/uploads/products/...`, visível
   inspecionando o elemento `<img>` no DevTools).
3. Editar esse mesmo produto sem trocar a imagem → salvar → confirmar que a imagem exibida no
   card continua a mesma (não regrediu pra vazio nem pediu re-upload).
4. Editar de novo trocando a imagem por um novo arquivo → salvar → confirmar que o card atualiza
   para a nova imagem.
5. Editar um produto do seed (imagem externa do picsum.photos) sem trocar a imagem → salvar →
   confirmar que a imagem do seed continua aparecendo normalmente.

- [ ] **Step 4: Commit**

(Sem repositório git neste projeto — pule este passo.)

---

### Task 5: Atualizar o README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Adicionar uma decisão arquitetural sobre o upload de imagens**

Na seção "Decisões arquiteturais" do `README.md`, logo após o parágrafo que começa com
"**Sem Docker Compose.**", adicionar o novo parágrafo:

```markdown
**Upload de imagens em disco local, com limpeza automática de órfãos.** O cadastro de produto
usa upload de arquivo real (não mais URL colada) — `multer` salva em `backend/uploads/products/`
e o backend serve esses arquivos como estático em `/uploads`. Ao trocar a imagem de um produto ou
excluí-lo, o arquivo antigo é removido do disco automaticamente — mas só quando a URL antiga
aponta pra um upload nosso; imagens externas (como as do seed, hospedadas no picsum.photos) nunca
são tocadas. Assim como o restante do projeto, não há serviço de storage em nuvem — mantém o
setup em ~5 minutos sem credenciais extras.
```

- [ ] **Step 2: Verificar visualmente**

Abrir o `README.md` renderizado (preview do editor) e confirmar que o novo parágrafo aparece no
lugar certo, sem quebrar a formatação da lista de decisões.

- [ ] **Step 3: Commit**

(Sem repositório git neste projeto — pule este passo.)

---

## Self-Review

**Cobertura do spec:** todas as seções do spec
(`docs/superpowers/specs/2026-07-15-upload-imagens-produtos-design.md`) têm task correspondente —
middleware/rota de upload (Task 1), limpeza de órfãos em update/delete (Task 2), função de API do
frontend (Task 3), UI do formulário (Task 4). O item de documentação (README) foi incluído como
Task 5 para manter o projeto consistente com o padrão já estabelecido de documentar decisões.

**Placeholders:** nenhum "TBD"/"implementar depois" — todo código está completo em cada step.

**Consistência de tipos:** `deleteUploadedImageIfLocal`, `uploadSingleProductImage`,
`UPLOADS_ROOT`/`PRODUCT_UPLOADS_DIR` (Task 1) são usados com o mesmo nome exato nas Tasks 2 e no
`app.ts`; `uploadProductImage` (Task 3) é consumido com o mesmo nome e assinatura na Task 4;
`ProductFormModal` mantém a mesma assinatura de props (`initial`, `saving`, `onClose`, `onSubmit`)
que `DashboardPage.tsx` já usa — nenhuma mudança adicional necessária lá.
