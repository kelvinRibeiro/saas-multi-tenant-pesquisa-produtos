import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../src/config/db";
import { Company } from "../src/models/Company";
import { User, hashPassword } from "../src/models/User";
import { Product } from "../src/models/Product";

const DEMO_PASSWORD = "senha123";

interface SeedProduct {
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
}

const techStoreProducts: SeedProduct[] = [
  { name: "Notebook Ultraslim 14\"", description: "Notebook leve com 16GB RAM, SSD 512GB e tela Full HD.", price: 4899.9, category: "Notebooks", imageUrl: "https://picsum.photos/seed/tech-notebook/400/300" },
  { name: "Mouse Sem Fio Ergonômico", description: "Mouse vertical sem fio, reduz tensão no pulso.", price: 129.9, category: "Acessórios", imageUrl: "https://picsum.photos/seed/tech-mouse/400/300" },
  { name: "Teclado Mecânico RGB", description: "Switches mecânicos, iluminação RGB customizável.", price: 349.0, category: "Acessórios", imageUrl: "https://picsum.photos/seed/tech-keyboard/400/300" },
  { name: "Monitor 27\" 4K", description: "Monitor IPS 4K com cobertura de 99% sRGB.", price: 2199.0, category: "Monitores", imageUrl: "https://picsum.photos/seed/tech-monitor/400/300" },
  { name: "Fone Bluetooth ANC", description: "Cancelamento de ruído ativo, 30h de bateria.", price: 599.9, category: "Áudio", imageUrl: "https://picsum.photos/seed/tech-headphone/400/300" },
  { name: "SSD NVMe 1TB", description: "Leitura de até 7000MB/s, ideal para upgrade de PC.", price: 449.0, category: "Armazenamento", imageUrl: "https://picsum.photos/seed/tech-ssd/400/300" },
  { name: "Webcam Full HD", description: "1080p 60fps com microfone embutido e correção de luz.", price: 259.0, category: "Acessórios", imageUrl: "https://picsum.photos/seed/tech-webcam/400/300" },
  { name: "Hub USB-C 7 em 1", description: "HDMI, USB 3.0, leitor de cartão e carregamento passthrough.", price: 179.9, category: "Acessórios", imageUrl: "https://picsum.photos/seed/tech-hub/400/300" },
  { name: "Cadeira Gamer Ergonômica", description: "Apoio lombar ajustável, reclinável até 160°.", price: 1299.0, category: "Móveis", imageUrl: "https://picsum.photos/seed/tech-chair/400/300" },
  { name: "Impressora Multifuncional", description: "Wi-Fi, impressão frente e verso automática.", price: 899.0, category: "Impressoras", imageUrl: "https://picsum.photos/seed/tech-printer/400/300" },
  { name: "Roteador Wi-Fi 6", description: "Cobertura de até 200m², suporta mais de 50 dispositivos.", price: 499.0, category: "Redes", imageUrl: "https://picsum.photos/seed/tech-router/400/300" },
  { name: "Smartwatch Fitness", description: "Monitor cardíaco, GPS integrado e resistência à água.", price: 799.0, category: "Wearables", imageUrl: "https://picsum.photos/seed/tech-watch/400/300" },
];

const casaDecoracaoProducts: SeedProduct[] = [
  { name: "Sofá Retrátil 3 Lugares", description: "Tecido suede, estrutura reforçada, reclinável.", price: 2399.0, category: "Sala de Estar", imageUrl: "https://picsum.photos/seed/casa-sofa/400/300" },
  { name: "Mesa de Jantar 6 Lugares", description: "Madeira maciça com acabamento em verniz fosco.", price: 1899.0, category: "Sala de Jantar", imageUrl: "https://picsum.photos/seed/casa-mesa/400/300" },
  { name: "Luminária de Piso Minimalista", description: "Design escandinavo, luz quente regulável.", price: 349.9, category: "Iluminação", imageUrl: "https://picsum.photos/seed/casa-luminaria/400/300" },
  { name: "Tapete Persa 2x3m", description: "Fibras sintéticas de alta durabilidade, antiderrapante.", price: 599.0, category: "Decoração", imageUrl: "https://picsum.photos/seed/casa-tapete/400/300" },
  { name: "Conjunto de Panelas Antiaderente", description: "5 peças, cabo termoisolante, compatível com indução.", price: 429.0, category: "Cozinha", imageUrl: "https://picsum.photos/seed/casa-panelas/400/300" },
  { name: "Cama Box Casal", description: "Colchão de espuma D33 com molas ensacadas.", price: 1699.0, category: "Quarto", imageUrl: "https://picsum.photos/seed/casa-cama/400/300" },
  { name: "Espelho de Parede Redondo", description: "Moldura em metal dourado, 80cm de diâmetro.", price: 259.0, category: "Decoração", imageUrl: "https://picsum.photos/seed/casa-espelho/400/300" },
  { name: "Cortina Blackout 2,80m", description: "Bloqueio de 100% da luz, tecido com forro térmico.", price: 189.0, category: "Decoração", imageUrl: "https://picsum.photos/seed/casa-cortina/400/300" },
  { name: "Estante Modular 5 Nichos", description: "MDF resistente, montagem sem ferramentas especiais.", price: 549.0, category: "Sala de Estar", imageUrl: "https://picsum.photos/seed/casa-estante/400/300" },
  { name: "Kit Jardim Vertical", description: "6 vasos autoirrigáveis com suporte de parede.", price: 219.0, category: "Jardim", imageUrl: "https://picsum.photos/seed/casa-jardim/400/300" },
  { name: "Jogo de Cama King 200 Fios", description: "100% algodão egípcio, 4 peças.", price: 329.0, category: "Quarto", imageUrl: "https://picsum.photos/seed/casa-jogo-cama/400/300" },
  { name: "Cadeira de Balanço Reclinável", description: "Estrutura em madeira eucalipto, estofado impermeável.", price: 749.0, category: "Sala de Estar", imageUrl: "https://picsum.photos/seed/casa-cadeira/400/300" },
];

async function seedCompany(companyName: string, adminEmail: string, userEmail: string, products: SeedProduct[]) {
  const company = await Company.create({ name: companyName });

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  await User.create([
    { name: `Admin ${companyName}`, email: adminEmail, passwordHash, role: "admin", companyId: company._id },
    { name: `Usuário ${companyName}`, email: userEmail, passwordHash, role: "user", companyId: company._id },
  ]);

  await Product.insertMany(products.map((p) => ({ ...p, companyId: company._id })));

  return company;
}

async function main(): Promise<void> {
  await connectDB();

  console.log("[seed] limpando coleções existentes...");
  await Promise.all([Company.deleteMany({}), User.deleteMany({}), Product.deleteMany({})]);

  const techStore = await seedCompany(
    "TechStore Brasil",
    "admin@techstore.com",
    "user@techstore.com",
    techStoreProducts,
  );

  const casaDecoracao = await seedCompany(
    "Casa & Decoração",
    "admin@casadecoracao.com",
    "user@casadecoracao.com",
    casaDecoracaoProducts,
  );

  console.log("\n[seed] concluído! Empresas e credenciais de teste:\n");
  console.log(`Empresa: ${techStore.name}  (companyId: ${techStore.id})`);
  console.log(`  admin -> admin@techstore.com / ${DEMO_PASSWORD}`);
  console.log(`  user  -> user@techstore.com / ${DEMO_PASSWORD}`);
  console.log(`\nEmpresa: ${casaDecoracao.name}  (companyId: ${casaDecoracao.id})`);
  console.log(`  admin -> admin@casadecoracao.com / ${DEMO_PASSWORD}`);
  console.log(`  user  -> user@casadecoracao.com / ${DEMO_PASSWORD}`);
  console.log("\nUse o companyId acima para testar o registro de um novo usuário em uma empresa existente.\n");
}

main()
  .then(() => mongoose.disconnect())
  .catch((err) => {
    console.error("[seed] falha:", err);
    process.exit(1);
  });
