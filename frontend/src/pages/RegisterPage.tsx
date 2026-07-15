import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { Spinner } from "../components/Spinner";
import { AuthShell } from "../components/AuthShell";

type Mode = "new-company" | "join-company";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("new-company");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await register({
        name,
        email,
        password,
        ...(mode === "new-company" ? { companyName } : { companyId }),
      });
      navigate("/dashboard");
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: string } } }).response?.data?.error ??
        "Não foi possível criar a conta.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Crie sua conta" subtitle="Comece uma empresa nova ou entre em uma já existente.">
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg bg-paper-2 p-1 text-sm font-medium">
        <button
          type="button"
          onClick={() => setMode("new-company")}
          className={
            "rounded-md py-1.5 transition-colors " +
            (mode === "new-company" ? "bg-white text-ink shadow-sm" : "text-ink-soft")
          }
        >
          Nova empresa
        </button>
        <button
          type="button"
          onClick={() => setMode("join-company")}
          className={
            "rounded-md py-1.5 transition-colors " +
            (mode === "join-company" ? "bg-white text-ink shadow-sm" : "text-ink-soft")
          }
        >
          Entrar em empresa
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-soft">
          Seu nome
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Maria Silva"
            className="rounded-lg border border-line bg-white px-3.5 py-2.5 text-ink outline-none transition-colors focus:border-primary"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-soft">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@empresa.com"
            className="rounded-lg border border-line bg-white px-3.5 py-2.5 text-ink outline-none transition-colors focus:border-primary"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-soft">
          Senha
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="mínimo 6 caracteres"
            className="rounded-lg border border-line bg-white px-3.5 py-2.5 text-ink outline-none transition-colors focus:border-primary"
          />
        </label>

        {mode === "new-company" ? (
          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-soft">
            Nome da empresa
            <input
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Minha Empresa Ltda"
              className="rounded-lg border border-line bg-white px-3.5 py-2.5 text-ink outline-none transition-colors focus:border-primary"
            />
            <span className="text-xs font-normal text-ink-faint">
              Você será o administrador desta empresa.
            </span>
          </label>
        ) : (
          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-soft">
            ID da empresa
            <input
              required
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              placeholder="ID fornecido pelo administrador"
              className="rounded-lg border border-line bg-white px-3.5 py-2.5 font-mono text-sm text-ink outline-none transition-colors focus:border-primary"
            />
            <span className="text-xs font-normal text-ink-faint">
              Você entrará como usuário (somente visualização + chat).
            </span>
          </label>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
        >
          {loading && <Spinner className="h-4 w-4" />}
          Criar conta
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-soft">
        Já tem conta?{" "}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Entrar
        </Link>
      </p>
    </AuthShell>
  );
}
