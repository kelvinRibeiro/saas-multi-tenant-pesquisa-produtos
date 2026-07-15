import "dotenv/config";
import app from "./app";
import { connectDB } from "./config/db";

const PORT = process.env.PORT ?? 4000;

async function main(): Promise<void> {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`[server] rodando em http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error("[server] falha ao iniciar:", err);
  process.exit(1);
});
