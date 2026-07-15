import { Request, Response } from "express";
import { Types } from "mongoose";
import { Company } from "../models/Company";
import { User, hashPassword } from "../models/User";
import { signToken } from "../utils/jwt";

export async function register(req: Request, res: Response): Promise<void> {
  const { name, email, password, companyName, companyId } = req.body ?? {};

  if (!name || !email || !password) {
    res.status(400).json({ error: "name, email e password são obrigatórios." });
    return;
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    res.status(409).json({ error: "Já existe uma conta com este email." });
    return;
  }

  let company;
  let role: "admin" | "user";

  if (companyId) {
    if (!Types.ObjectId.isValid(companyId)) {
      res.status(400).json({ error: "companyId inválido." });
      return;
    }
    company = await Company.findById(companyId);
    if (!company) {
      res.status(404).json({ error: "Empresa não encontrada para o companyId informado." });
      return;
    }
    role = "user";
  } else {
    if (!companyName) {
      res.status(400).json({ error: "Informe companyName (nova empresa) ou companyId (empresa existente)." });
      return;
    }
    company = await Company.create({ name: companyName });
    role = "admin";
  }

  const passwordHash = await hashPassword(password);
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    role,
    companyId: company._id,
  });

  const token = signToken({
    userId: user.id,
    companyId: company.id,
    role: user.role,
  });

  res.status(201).json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    company: { id: company.id, name: company.name },
  });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    res.status(400).json({ error: "email e password são obrigatórios." });
    return;
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !(await user.comparePassword(password))) {
    res.status(401).json({ error: "Credenciais inválidas." });
    return;
  }

  const company = await Company.findById(user.companyId);
  if (!company) {
    res.status(500).json({ error: "Empresa associada ao usuário não encontrada." });
    return;
  }

  const token = signToken({
    userId: user.id,
    companyId: company.id,
    role: user.role,
  });

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    company: { id: company.id, name: company.name },
  });
}
