import express, { Request, Response } from 'express';
import cors from 'cors';

import { config } from './config.js';
import { db, initializeDatabase } from './db.js';

import accountsRoutes from './routes/accounts.js';
import journalRoutes from './routes/journal.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    service: 'H2pro API',
    environment: config.nodeEnv,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/summary', (_req: Request, res: Response) => {
  db.get(
    `SELECT
      (SELECT COUNT(*) FROM accounts) AS account_count,
      (SELECT COUNT(*) FROM customers) AS customer_count,
      (SELECT COUNT(*) FROM suppliers) AS supplier_count,
      (SELECT COUNT(*) FROM items) AS item_count`,
    (error, row) => {
      if (error) {
        res.status(500).json({ error: 'فشل في جلب ملخص النظام', details: error.message });
        return;
      }

      res.json({
        ok: true,
        data: row
      });
    }
  );
});

// Mount routes
app.use('/api/accounts', accountsRoutes);
app.use('/api/journal_entries', journalRoutes);

const startServer = async () => {
  try {
    await initializeDatabase();

    app.listen(config.port, () => {
      console.log(`H2pro API running on http://localhost:${config.port}`);
    });
  } catch (error) {
    console.error('Failed to initialize H2pro database:', error);
    process.exit(1);
  }
};

startServer();
