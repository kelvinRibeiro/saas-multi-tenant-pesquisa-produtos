import type { UserRole } from "../types";

export function RoleBadge({ role }: { role: UserRole }) {
  const isAdmin = role === "admin";
  return (
    <span
      className={
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium tracking-wide uppercase " +
        (isAdmin ? "bg-accent-soft text-accent-soft-text" : "bg-primary-soft text-primary-soft-text")
      }
    >
      {isAdmin ? "Admin" : "Usuário"}
    </span>
  );
}
