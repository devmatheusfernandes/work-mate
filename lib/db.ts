import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL não configurada no arquivo .env");
}

// Em Next.js (Serverless/Edge), reaproveitamos a conexão
const queryClient = postgres(connectionString, { prepare: false });
export const db = drizzle(queryClient);
