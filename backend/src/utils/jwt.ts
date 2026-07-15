import jwt, { SignOptions } from "jsonwebtoken";
import { UserRole } from "../models/User";

export interface JwtPayload {
  userId: string;
  companyId: string;
  role: UserRole;
}

export function signToken(payload: JwtPayload): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET não definida no .env");

  const expiresIn = (process.env.JWT_EXPIRES_IN ?? "7d") as SignOptions["expiresIn"];
  return jwt.sign(payload, secret, { expiresIn });
}

export function verifyToken(token: string): JwtPayload {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET não definida no .env");

  return jwt.verify(token, secret) as JwtPayload;
}
