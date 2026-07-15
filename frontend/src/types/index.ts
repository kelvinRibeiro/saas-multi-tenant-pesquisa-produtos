export type UserRole = "admin" | "user";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthCompany {
  id: string;
  name: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
  company: AuthCompany;
}

export interface Product {
  _id: string;
  companyId: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  createdAt: string;
  updatedAt: string;
}

export type ProductInput = Pick<Product, "name" | "description" | "price" | "category" | "imageUrl">;

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  reply: string;
  history: ChatTurn[];
}
