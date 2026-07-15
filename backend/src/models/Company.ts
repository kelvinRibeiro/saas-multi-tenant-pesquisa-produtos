import { Schema, model, Document } from "mongoose";

export interface ICompany extends Document {
  name: string;
  createdAt: Date;
}

const companySchema = new Schema<ICompany>({
  name: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now },
});

export const Company = model<ICompany>("Company", companySchema);
