# Dark Mode

## Contexto

O usuário quer poder trocar entre tema claro e escuro no layout do sistema. Hoje o app (React +
Tailwind v4) só tem uma paleta clara, definida como variáveis CSS num bloco `@theme` em
`frontend/src/index.css`. Como o Tailwind v4 gera utilities (`bg-paper`, `text-ink`, etc.) que
referenciam essas variáveis via `var(--color-*)` em vez de valores fixos, dá pra implementar o
dark mode redefinindo os valores das variáveis sob um seletor `[data-theme="dark"]`, sem precisar
adicionar `dark:` em cada componente.

Duas coisas no código atual quebrariam essa abordagem se não forem ajustadas (auditado via grep
em todo `frontend/src`, não é suposição):

1. **`bg-white` hardcoded** (Tailwind puro, não nossa variável) em 11 ocorrências dentro de 6
   arquivos — inputs de login/registro, o toggle de modo do registro, o modal de produto, o card
   de produto, a bolha de chat do assistente e o input do chat. Sem ajuste, ficariam brancos
   chapados no tema escuro.
2. **`text-primary-dark` / `text-accent-dark` têm dois papéis conflitantes**: fundo sempre-escuro
   (Navbar, painel da tela de login) e texto sobre fundo "soft" claro (badges de categoria/role).
   No escuro, o fundo "soft" vira escuro e o texto precisa virar claro — o oposto do que o token
   de "fundo escuro" faz. Usados como texto-sobre-soft em exatamente 3 lugares: `RoleBadge.tsx`,
   `ProductCard.tsx` (tag de categoria) e `ProductFormModal.tsx` (label do input de arquivo).

## Decisões

- **Sem opção "sistema"** — só um toggle claro/escuro (confirmado com o usuário).
- **Persistência em `localStorage`** (mesmo padrão do JWT hoje), não no backend/schema do usuário.
- **Padrão quando não há preferência salva:** claro (mantém o visual atual pra quem nunca trocou).
- **Toggle só na Navbar** (visível após login) — as telas de login/registro não têm o botão, mas
  respeitam a preferência já salva (o atributo `data-theme` é aplicado no `<html>`, então vale
  pra qualquer rota).

## Paleta escura

Todos os valores abaixo entram em `frontend/src/index.css`, dentro de um seletor
`:root[data-theme="dark"]` (fora do bloco `@theme`, que só declara os valores padrão/claros).

```css
:root[data-theme="dark"] {
  color-scheme: dark;

  --color-paper: #141d19;
  --color-paper-2: #1b2620;
  --color-ink: #edf1ec;
  --color-ink-soft: #a3ada5;
  --color-ink-faint: #6d766e;

  --color-primary: #3f9c82;
  --color-primary-dark: #0d3229;
  --color-primary-soft: #1c3a32;
  --color-primary-soft-text: #a7e0cd;

  --color-accent: #ea7a52;
  --color-accent-dark: #c9683f;
  --color-accent-soft: #3a231b;
  --color-accent-soft-text: #f3b596;

  --color-danger: #e0655a;
  --color-danger-soft: #3a201c;

  --color-line: #2b3934;
  --color-surface: #1c2723;
}
```

E dois tokens novos no bloco `@theme` (valores claros, iguais ao que `-dark` já vale hoje —
preserva o visual atual no tema claro):

```css
--color-surface: #ffffff;
--color-primary-soft-text: #12463a; /* mesmo valor que --color-primary-dark tinha */
--color-accent-soft-text: #c25a35;  /* mesmo valor que --color-accent-dark tinha */
```

`--color-primary-dark` e `--color-accent-dark` continuam existindo e sendo usados só pro papel de
"fundo/hover escuro" (Navbar, painel de login, hover de botões primary) — não mudam de
significado, só passam a não ser mais usados como cor de texto.

## Mudanças por arquivo

### `frontend/src/index.css`
Adiciona os 2 tokens novos ao `@theme`, e o bloco `:root[data-theme="dark"]` inteiro (acima).

### `frontend/src/context/ThemeContext.tsx` (novo)
Mesmo padrão do `AuthContext.tsx` existente: `ThemeProvider` com `useState<"light" | "dark">`
inicializado a partir do `localStorage` (chave `saas_theme`), um `useEffect` que aplica
`document.documentElement.dataset.theme = theme` toda vez que o estado muda, e um hook
`useTheme()` expondo `{ theme, toggleTheme }`.

### `frontend/src/App.tsx`
Envolve o app com `<ThemeProvider>` (mesmo nível do `<AuthProvider>`).

### `frontend/src/components/Navbar.tsx`
Adiciona um botão de ícone (sol/lua, `lucide-react`) que chama `toggleTheme()`, posicionado antes
do botão "Sair".

### `bg-white` → `bg-surface` (6 arquivos, 11 ocorrências)
`LoginPage.tsx` (2), `RegisterPage.tsx` (7, incluindo o toggle "Nova empresa"/"Entrar em
empresa"), `ProductCard.tsx` (1 — o fundo do card; a outra ocorrência, `bg-white/70`, é o
"furinho" decorativo da etiqueta de preço e **não muda**, é sempre um pontinho branco sobre a tag
laranja), `ProductFormModal.tsx` (1 — fundo do modal), `ChatBubble.tsx` (1 — bolha do
assistente), `ChatPage.tsx` (1 — input de mensagem).

### `text-primary-dark`/`text-accent-dark` → `text-primary-soft-text`/`text-accent-soft-text` (3 arquivos)
`RoleBadge.tsx` (as duas classes), `ProductCard.tsx` (tag de categoria, `text-primary-dark`),
`ProductFormModal.tsx` (label do input de arquivo, `text-primary-dark`). Os usos de
`bg-primary-dark`/`bg-accent-dark` (Navbar, AuthShell, hover de botões) **não mudam**.

## Fora de escopo

- Sem seguir `prefers-color-scheme` do sistema operacional (usuário optou por não ter essa opção).
- Sem persistência por conta de usuário (localStorage é por navegador, decisão do usuário).
- Sem toggle nas telas de login/registro (só aparece após autenticar, na Navbar).

## Verificação

1. Com o app rodando, no tema padrão (claro), confirmar que nada mudou visualmente em nenhuma
   tela (Login, Register, Dashboard, Chat) comparado ao estado atual.
2. Clicar no toggle na Navbar → confirmar que todas as telas (inclusive login/registro, navegando
   até elas com a preferência já salva) mudam para o tema escuro, com contraste de texto legível
   em todos os elementos (inputs, cards, modal, badges, bolhas de chat, tag de preço).
3. Recarregar a página com o tema escuro ativo → confirmar que a preferência persiste
   (`localStorage`).
4. Conferir especificamente os 3 pontos de risco: badge de role (admin/user) e tag de categoria
   legíveis no escuro; card de produto e modal de edição com fundo escuro e texto claro; bolha do
   assistente no chat legível sobre fundo escuro.
5. Rodar `npx tsc -b --noEmit` no frontend.
