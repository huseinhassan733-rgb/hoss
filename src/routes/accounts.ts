import express, { Request, Response } from 'express';
import * as accountSvc from '../services/accountsService.js';

const router = express.Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    const account = await accountSvc.createAccount(payload);
    res.status(201).json({ ok: true, data: account });
  } catch (err: any) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

router.get('/', async (_req: Request, res: Response) => {
  try {
    const accounts = await accountSvc.listAccounts();
    res.json({ ok: true, data: accounts });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const account = await accountSvc.getAccountById(id);
    if (!account) return res.status(404).json({ ok: false, error: 'Account not found' });
    res.json({ ok: true, data: account });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
