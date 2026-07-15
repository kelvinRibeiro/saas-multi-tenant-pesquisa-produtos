# Upload de imagens no cadastro de produtos

## Contexto

O cadastro de produtos hoje exige que o admin cole uma URL de imagem já hospedada externamente
(`imageUrl`, campo de texto). Isso não é realista para um admin cadastrando produtos próprios —
ele precisa poder enviar um arquivo de imagem do computador dele. Esta mudança adiciona upload de
arquivo ao formulário de produto, mantendo o schema do `Product` inalterado (`imageUrl` continua
sendo uma URL absoluta — agora podendo apontar tanto para uma imagem externa quanto para uma
servida pelo próprio backend), e adiciona limpeza dos arquivos que ficariam órfãos no disco quando
uma imagem é substituída ou um produto é excluído.

## Decisões

- **Armazenamento**: disco local do backend (`backend/uploads/products/`), servido como estático
  via `express.static`. Sem dependência de serviço de nuvem — mantém o setup em ~5 minutos.
- **UI**: o campo de texto "URL da imagem" é substituído por um `<input type="file">` com preview.
  Não há mais opção de colar URL manualmente no formulário.
- **Endpoint separado de upload** (`POST /api/products/images`), não uma única request multipart
  combinando upload + dados do produto. O frontend faz upload primeiro, recebe a URL, e então
  chama o create/update de produto existente (JSON, inalterado). Menos invasivo: zero mudança na
  assinatura de `product.controller.ts`.
- **Limpeza de arquivos órfãos**: ao trocar a imagem de um produto (update) ou excluir um produto,
  o arquivo antigo é removido do disco — mas só se ele for um upload local nosso (nunca uma URL
  externa, como as do seed).

## Backend

### Novo middleware `backend/src/middleware/upload.ts`

- Configura `multer.diskStorage`: destino `path.join(process.cwd(), "uploads", "products")`
  (criado com `fs.mkdirSync(..., { recursive: true })` na inicialização); nome do arquivo gerado
  via `crypto.randomUUID() + extensão original` — nunca o nome original do usuário (evita
  colisão e qualquer tentativa de path traversal).
- `fileFilter`: aceita apenas MIME types `image/jpeg`, `image/png`, `image/webp`, `image/gif`.
- `limits.fileSize`: 5MB.
- Exporta um middleware wrapper que invoca o multer manualmente (não como middleware direto na
  rota) para capturar `MulterError`/erros de `fileFilter` e responder `400` com mensagem clara,
  em vez de cair no handler de erro genérico (500).
- Exporta também `deleteUploadedImageIfLocal(imageUrl: string): Promise<void>`:
  - Faz `new URL(imageUrl)` (se não for uma URL absoluta válida, retorna sem fazer nada).
  - Confirma que `pathname` começa com `/uploads/products/` — caso contrário (URL externa, ex.
    picsum.photos do seed), não faz nada.
  - Extrai o nome do arquivo com `path.basename(pathname)` e tenta `fs.promises.unlink` no path
    resultante dentro de `UPLOADS_DIR`.
  - Erros de remoção (ex. arquivo já não existe — `ENOENT`) são ignorados silenciosamente; outros
    erros são logados via `console.error`, mas nunca lançados — limpeza de arquivo é best-effort e
    nunca deve derrubar a operação principal (excluir/atualizar o produto no banco).

### Nova rota em `backend/src/routes/product.routes.ts`

```
router.post("/images", requireAdmin, uploadSingleProductImage, asyncHandler(uploadProductImageHandler));
```

Herda `authenticate` do `router.use(authenticate)` já existente no arquivo.

### Novo controller `uploadProductImageHandler` em `product.controller.ts`

- Se `req.file` ausente → 400 `{ error: "Nenhum arquivo enviado." }`.
- Caso contrário, responde `201 { imageUrl: "<protocolo>://<host>/uploads/products/<filename>" }`
  usando `req.protocol` + `req.get("host")` para montar a URL absoluta.

### `product.service.ts` — limpeza integrada ao update/delete

- `updateProduct(companyId, productId, data)`: passa a buscar o produto existente **antes** de
  atualizar (`Product.findOne(...)`); se não existir, retorna `null` como já fazia. Após o
  `findOneAndUpdate` ter sucesso, se `data.imageUrl` foi enviado e é diferente do
  `existing.imageUrl`, chama `deleteUploadedImageIfLocal(existing.imageUrl)` para remover a imagem
  antiga do disco.
- `deleteProduct(companyId, productId)`: troca `findOneAndDelete` (que já retorna o documento
  removido) para capturar o `imageUrl` do produto excluído e chamar
  `deleteUploadedImageIfLocal(deletedProduct.imageUrl)` antes de retornar `true`.

### `app.ts`

- Adiciona `app.use("/uploads", express.static(UPLOADS_DIR))` (mesma constante de diretório usada
  pelo middleware de upload, para não duplicar o path).

### Dependências novas

- `multer` (dependency) + `@types/multer` (devDependency).

## Frontend

### `frontend/src/api/products.ts`

- Nova função `uploadProductImage(file: File): Promise<{ imageUrl: string }>` — monta um
  `FormData` com o campo `image` e faz `apiClient.post("/products/images", formData)` (axios seta
  o `Content-Type: multipart/form-data` automaticamente a partir do `FormData`, não deve ser
  setado manualmente).

### `frontend/src/components/ProductFormModal.tsx`

- Remove o `<input type="url">` de "URL da imagem".
- Adiciona `<input type="file" accept="image/jpeg,image/png,image/webp,image/gif">` + preview da
  imagem (atual em modo edição, ou `URL.createObjectURL(file)` do arquivo recém-selecionado).
- Estado novo: `file: File | null` e `previewUrl: string` (inicializado com `initial?.imageUrl`).
- No submit: se `file` estiver setado, chama `uploadProductImage(file)` primeiro (estado
  `uploading` mostra spinner e desabilita o botão de salvar), pega a `imageUrl` retornada, e só
  então chama o `onSubmit` existente com o payload completo (mesmo formato de antes — inclui a
  imagem antiga na atualização do backend, que decide se apaga o arquivo velho). Se não há `file`
  novo (edição sem trocar imagem), usa `form.imageUrl` como já está — o backend não apaga nada
  porque a `imageUrl` enviada é igual à existente.
- Falha de upload: toast de erro (`react-hot-toast`, já usado no restante do app) e não prossegue
  para criar/editar o produto.
- Criação de produto exige uma imagem selecionada (obrigatório, mesma regra que já existia pro
  campo de URL).

### Sem mudanças em `ProductCard.tsx` ou `types/index.ts`

`imageUrl` continua uma `string` simples — o card já renderiza `<img src={product.imageUrl}>`
independente de a URL ser externa (seed) ou local (upload novo).

## Fora de escopo (limitações assumidas)

- Sem redimensionamento/otimização da imagem enviada — salva como recebida.
- `req.protocol`/`req.get("host")` não considera cabeçalhos de proxy reverso (`X-Forwarded-Proto`)
  — aceitável para o escopo de dev/demo deste projeto.
- A checagem de "é um upload local?" é só pelo `pathname` (`/uploads/products/...`), sem validar o
  host — em um cenário hipotético de múltiplos ambientes apontando pro mesmo path, isso poderia
  tentar apagar um arquivo que não existe nesse disco (inofensivo: vira um `ENOENT` ignorado).

## Verificação

1. Como admin, abrir "Novo produto" → selecionar um arquivo de imagem → ver preview → salvar →
   confirmar que o produto aparece no grid com a imagem enviada (URL local, ex.
   `http://localhost:4000/uploads/products/...`).
2. Editar um produto existente sem trocar a imagem → confirmar que a `imageUrl` original (do seed,
   externa) é preservada e nenhum arquivo é apagado.
3. Editar um produto trocando a imagem → confirmar que a nova imagem substitui a exibida **e** que
   o arquivo antigo (se local) some de `backend/uploads/products/`.
4. Excluir um produto com imagem local → confirmar que o arquivo correspondente é removido do
   disco.
5. Excluir/editar um produto com imagem do seed (externa) → confirmar que nada é apagado do disco
   (a URL externa nunca aponta pra dentro de `uploads/products/`).
6. Tentar enviar um arquivo não-imagem (ex. `.txt`) ou maior que 5MB → confirmar erro 400 com
   mensagem clara, exibido como toast no frontend.
7. Rodar `npx tsc --noEmit` no backend e no frontend após as mudanças.
