import { Sparkles } from "lucide-react";
import type { ChatTurn } from "../types";

export function ChatBubble({ turn }: { turn: ChatTurn }) {
  const isUser = turn.role === "user";

  return (
    <div className={"flex items-end gap-2 " + (isUser ? "flex-row-reverse" : "")}>
      {!isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-white">
          <Sparkles size={14} />
        </div>
      )}
      <div
        className={
          "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap " +
          (isUser
            ? "rounded-br-sm bg-primary text-white"
            : "rounded-bl-sm border border-line bg-surface text-ink")
        }
      >
        {turn.content}
      </div>
    </div>
  );
}
