import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { DATABASE_URL } from '$env/static/private';

// max: 1 is important for serverless environments (Vercel)
const client = postgres(DATABASE_URL, { max: 1 });

export const db = drizzle(client, { schema });
