import express, { Request, Response } from 'express';
import * as journalSvc from '../services/journalService.js';

const router = express.Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    const result = await journalSvc.createJournalEntry(payload);
    res.status(201).json({ ok: true, data: { id: result.id } });
  } catch (err: any) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

router.get('/', async (_req: Request, res: Response) => {
  try {
    const entries = await journalSvc.listJournalEntries();
    res.json({ ok: true, data: entries });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const entry = await journalSvc.getJournalEntryById(id);
    if (!entry) return res.status(404).json({ ok: false, error: 'Journal entry not found' });
    res.json({ ok: true, data: entry });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/:id/post', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await journalSvc.postJournalEntry(id);
    res.json({ ok: true, message: 'Entry posted' });
  } catch (err: any) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

export default router;
