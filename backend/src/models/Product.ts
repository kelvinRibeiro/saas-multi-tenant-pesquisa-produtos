import { Schema, model, Document, Types } from "mongoose";

export interface IProduct extends Document {
  companyId: Types.ObjectId;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, trim: true, index: true },
    imageUrl: { type: String, required: true },
  },
  { timestamps: true },
);

// Índice composto: toda listagem/filtro real é sempre por empresa.
productSchema.index({ companyId: 1, category: 1 });

export const Product = model<IProduct>("Product", productSchema);
