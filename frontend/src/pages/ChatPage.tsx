import { useEffect, useRef, useState, type FormEvent } from "react";
import { Send, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { sendChatMessage } from "../api/chat";
import { ChatBubble } from "../components/ChatBubble";
import { Spinner } from "../components/Spinner";
import { useAuth } from "../context/AuthContext";
import type { ChatTurn } from "../types";

export function ChatPage() {
  const { session } = useAuth();
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, sending]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const message = input.trim();
    if (!message || sending) return;

    setInput("");
    setHistory((h) => [...h, { role: "user", content: message }]);
    setSending(true);

    try {
      const res = await sendChatMessage(message, history);
      setHistory((h) => [...h.slice(0, -1), ...res.history]);
    } catch {
      toast.error("O assistente não respondeu. Tente novamente.");
      setHistory((h) => h.slice(0, -1));
      setInput(message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-64px)] max-w-3xl flex-col px-4 py-6 sm:px-6">
      <div className="mb-4">
        <h1 className="font-display text-2xl font-semibold text-ink">Assistente de produtos</h1>
        <p className="text-sm text-ink-soft">
          Pergunte sobre o catálogo de <span className="font-medium">{session?.company.name}</span> —
          as respostas usam apenas produtos reais cadastrados.
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto rounded-xl border border-line bg-paper-2/60 p-4">
        {history.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-ink-faint">
            <Sparkles size={28} />
            <p className="text-sm">
              Experimente perguntar: "vocês têm produtos de cozinha?" ou "qual o mais barato de
              acessórios?"
            </p>
          </div>
        )}
        {history.map((turn, i) => (
          <ChatBubble key={i} turn={turn} />
        ))}
        {sending && (
          <div className="flex items-center gap-2 text-sm text-ink-faint">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-white">
              <Sparkles size={14} />
            </div>
            <Spinner className="h-4 w-4" />
            digitando...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escreva sua pergunta..."
          className="flex-1 rounded-lg border border-line bg-white px-4 py-2.5 text-ink outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
