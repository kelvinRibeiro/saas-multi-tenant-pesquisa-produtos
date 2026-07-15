import { NavLink } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { RoleBadge } from "./RoleBadge";

const tabClass = ({ isActive }: { isActive: boolean }) =>
  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors " +
  (isActive ? "bg-white/15 text-white" : "text-white/70 hover:text-white hover:bg-white/10");

export function Navbar() {
  const { session, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  if (!session) return null;

  return (
    <header className="sticky top-0 z-10 bg-primary-dark shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-6">
          <span className="font-display text-lg font-semibold tracking-tight text-white">
            Catálogo<span className="text-accent">.</span>
          </span>
          <nav className="flex items-center gap-1">
            <NavLink to="/dashboard" className={tabClass}>
              Produtos
            </NavLink>
            <NavLink to="/chat" className={tabClass}>
              Chat
            </NavLink>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-white">{session.company.name}</p>
            <p className="text-xs text-white/60">{session.user.name}</p>
          </div>
          <RoleBadge role={session.user.role} />
          <button
            onClick={toggleTheme}
            aria-label={theme === "light" ? "Ativar tema escuro" : "Ativar tema claro"}
            className="rounded-md border border-white/20 p-1.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
          </button>
          <button
            onClick={logout}
            className="rounded-md border border-white/20 px-3 py-1.5 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            Sair
          </button>
        </div>
      </div>
    </header>
  );
}
