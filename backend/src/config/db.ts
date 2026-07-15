import mongoose from "mongoose";

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI não definida no .env");
  }

  await mongoose.connect(uri);
  console.log(`[db] conectado ao MongoDB: ${mongoose.connection.name}`);
}
