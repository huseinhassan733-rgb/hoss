import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: Number(process.env.PORT ?? 3000),
  dbPath: process.env.DB_PATH ?? './data/h2pro.db',
  nodeEnv: process.env.NODE_ENV ?? 'development'
};
