import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

const connectionString = process.env.DATABASE_URL!;
// prepare:false required for Supabase transaction pooler mode
const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client, { schema });
