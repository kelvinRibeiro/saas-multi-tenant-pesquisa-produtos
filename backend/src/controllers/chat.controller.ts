import { Request, Response } from "express";
import { runChat, ChatTurn } from "../services/llm.service";

export async function chat(req: Request, res: Response): Promise<void> {
  const { message, history } = req.body ?? {};

  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "message é obrigatório." });
    return;
  }

  const safeHistory: ChatTurn[] = Array.isArray(history)
    ? history.filter(
        (turn): turn is ChatTurn =>
          turn && (turn.role === "user" || turn.role === "assistant") && typeof turn.content === "string",
      )
    : [];

  const reply = await runChat(req.user!.companyId, message, safeHistory);

  const updatedHistory: ChatTurn[] = [
    ...safeHistory,
    { role: "user", content: message },
    { role: "assistant", content: reply },
  ];

  res.json({ reply, history: updatedHistory });
}
