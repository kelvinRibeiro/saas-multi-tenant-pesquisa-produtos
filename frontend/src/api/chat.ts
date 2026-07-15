import { apiClient } from "./client";
import type { ChatResponse, ChatTurn } from "../types";

export async function sendChatMessage(message: string, history: ChatTurn[]): Promise<ChatResponse> {
  const { data } = await apiClient.post<ChatResponse>("/chat", { message, history });
  return data;
}
