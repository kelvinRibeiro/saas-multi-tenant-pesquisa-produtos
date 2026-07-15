import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam, Tool, ToolUseBlock, ToolResultBlockParam } from "@anthropic-ai/sdk/resources/messages";
import { findProducts } from "./product.service";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.CLAUDE_MODEL ?? "claude-sonnet-5";
const MAX_TOOL_ITERATIONS = 4;

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `Você é um assistente de atendimento ao cliente de uma loja online.
Responda perguntas sobre os produtos da empresa usando SEMPRE a tool "search_products" para
consultar o catálogo real antes de responder — nunca invente produtos, preços ou disponibilidade.
Se a busca não retornar nada relevante, diga claramente que não encontrou o produto no catálogo.
Seja objetivo, simpático e responda em português do Brasil.`;

// O schema NÃO inclui company_id: o modelo nunca decide de qual empresa buscar.
// O company_id usado na execução real da tool vem sempre do usuário autenticado.
const searchProductsTool: Tool = {
  name: "search_products",
  description:
    "Busca produtos no catálogo da empresa do usuário autenticado. Use para responder qualquer " +
    "pergunta sobre produtos disponíveis, preços ou categorias.",
  input_schema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Termo de busca livre (nome, descrição ou categoria do produto).",
      },
      category: {
        type: "string",
        description: "Categoria exata do produto, se o usuário mencionar uma categoria específica.",
      },
      max_price: {
        type: "number",
        description: "Preço máximo, se o usuário quiser filtrar por orçamento.",
      },
    },
  },
};

export async function runChat(companyId: string, message: string, history: ChatTurn[] = []): Promise<string> {
  const messages: MessageParam[] = [
    ...history.map((turn) => ({ role: turn.role, content: turn.content }) as MessageParam),
    { role: "user", content: message },
  ];

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: [searchProductsTool],
      messages,
    });

    if (response.stop_reason !== "tool_use") {
      return extractText(response.content);
    }

    messages.push({ role: "assistant", content: response.content });

    const toolUseBlocks = response.content.filter(
      (block): block is ToolUseBlock => block.type === "tool_use",
    );

    const toolResults: ToolResultBlockParam[] = [];
    for (const toolUse of toolUseBlocks) {
      const result = await executeTool(companyId, toolUse);
      toolResults.push({ type: "tool_result", tool_use_id: toolUse.id, content: result });
    }

    messages.push({ role: "user", content: toolResults });
  }

  return "Desculpe, não consegui concluir a busca no catálogo agora. Tente reformular sua pergunta.";
}

async function executeTool(companyId: string, toolUse: ToolUseBlock): Promise<string> {
  if (toolUse.name !== "search_products") {
    return JSON.stringify({ error: `Tool desconhecida: ${toolUse.name}` });
  }

  const input = toolUse.input as { query?: string; category?: string; max_price?: number };
  const products = await findProducts(companyId, {
    query: input.query,
    category: input.category,
    maxPrice: input.max_price,
  });

  return JSON.stringify(
    products.map((p) => ({
      name: p.name,
      description: p.description,
      price: p.price,
      category: p.category,
    })),
  );
}

function extractText(content: Anthropic.Messages.ContentBlock[]): string {
  return content
    .filter((block): block is Anthropic.Messages.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}
