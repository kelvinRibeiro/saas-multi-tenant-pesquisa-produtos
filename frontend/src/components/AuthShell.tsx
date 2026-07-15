import type { ReactNode } from "react";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary-dark p-10 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
        <span className="relative font-display text-xl font-semibold tracking-tight">
          Catálogo<span className="text-accent">.</span>
        </span>
        <div className="relative max-w-sm">
          <p className="font-display text-3xl leading-tight font-medium">
            Um catálogo por empresa. <span className="text-accent">Zero</span> vazamento entre elas.
          </p>
          <p className="mt-4 text-sm text-white/60">
            Cada empresa cadastra seus próprios produtos e conversa com um agente de IA que só
            enxerga o catálogo dela — nunca o de outra empresa.
          </p>
        </div>
        <p className="relative text-xs text-white/40">Mini SaaS multi-tenant · demo técnica</p>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <h1 className="font-display text-2xl font-semibold text-ink">{title}</h1>
          <p className="mt-1.5 text-sm text-ink-soft">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
